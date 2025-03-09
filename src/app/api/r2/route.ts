import { NextRequest, NextResponse } from 'next/server';
import { 
  S3Client, 
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 配置接口
interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// 开发环境日志记录
const logDebug = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[R2 API] ${message}`, data || '');
  }
};

// 获取客户端实例
function getR2Client(config: R2Config) {
  return new S3Client({
    region: config.region || 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

// API 路由
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const key = url.searchParams.get('key') || '';
    const prefix = url.searchParams.get('prefix') || '';
    const configParam = url.searchParams.get('config');
    
    logDebug(`处理 GET 请求: action=${action}, key=${key}, prefix=${prefix}`);
    
    // 解析配置
    let config: R2Config;
    
    if (configParam) {
      try {
        config = JSON.parse(decodeURIComponent(configParam)) as R2Config;
        logDebug("配置解析成功", {
          endpoint: config.endpoint,
          region: config.region,
          bucketName: config.bucketName,
          // 不记录敏感凭证
          hasAccessKey: !!config.accessKeyId,
          hasSecretKey: !!config.secretAccessKey
        });
      } catch {
        logDebug("配置解析失败");
        return NextResponse.json({ error: '配置参数无效' }, { status: 400 });
      }
    } else {
      logDebug("请求中缺少配置参数");
      return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
    }
    
    // 验证配置
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      return NextResponse.json({ error: '配置不完整' }, { status: 400 });
    }
    
    // 创建 S3 客户端
    const s3 = getR2Client(config);
    
    // 处理不同的操作
    switch (action) {
      case 'listObjects': {
        // 列出对象
        const command = new ListObjectsV2Command({
          Bucket: config.bucketName,
          Prefix: prefix,
          Delimiter: '/'
        });
        
        const response = await s3.send(command);
        
        // 处理文件和文件夹
        const files = (response.Contents || []).map(item => ({
          key: item.Key || '',
          size: item.Size || 0,
          lastModified: item.LastModified,
          etag: item.ETag
        }));
        
        // 处理文件夹（前缀）
        const folders = (response.CommonPrefixes || []).map(prefix => ({
          key: prefix.Prefix || '',
          size: 0,
          lastModified: new Date(),
          isFolder: true
        }));
        
        return NextResponse.json({
          prefix: prefix,
          objects: [...folders, ...files]
        });
      }
      
      case 'getSignedUrl': {
        if (!key) {
          return NextResponse.json({ error: '缺少文件键参数' }, { status: 400 });
        }
        
        // 生成预签名 URL
        const command = new GetObjectCommand({
          Bucket: config.bucketName,
          Key: key
        });
        
        // 链接有效期设置为 1 小时
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        
        return NextResponse.json({ signedUrl });
      }
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('API 错误:', error);
    return NextResponse.json({ error: '处理请求时出错' }, { status: 500 });
  }
}

// 处理上传请求
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'upload';
    const key = url.searchParams.get('key');
    const configParam = url.searchParams.get('config');
    
    // 解析配置
    let config: R2Config;
    
    if (configParam) {
      try {
        config = JSON.parse(decodeURIComponent(configParam)) as R2Config;
      } catch {
        return NextResponse.json({ error: '配置参数无效' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
    }
    
    // 验证配置
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      return NextResponse.json({ error: '配置不完整' }, { status: 400 });
    }
    
    // 创建 S3 客户端
    const s3 = getR2Client(config);
    
    if (action === 'upload') {
      if (!key) {
        return NextResponse.json({ error: '缺少键参数' }, { status: 400 });
      }
      
      // 获取文件数据
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: '没有文件上传' }, { status: 400 });
      }
      
      // 读取文件为 ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      
      // 上传到 R2
      const uploadCommand = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: Buffer.from(fileBuffer),
        ContentType: file.type
      });
      
      await s3.send(uploadCommand);
      
      return NextResponse.json({ success: true, key });
      
    } else if (action === 'createFolder') {
      if (!key) {
        return NextResponse.json({ error: '缺少键参数' }, { status: 400 });
      }
      
      // 确保键以斜杠结尾
      const folderKey = key.endsWith('/') ? key : `${key}/`;
      
      // 创建空对象作为文件夹
      const createFolderCommand = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: folderKey,
        Body: ''
      });
      
      await s3.send(createFolderCommand);
      
      return NextResponse.json({ success: true, key: folderKey });
    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json({ error: '上传文件时出错' }, { status: 500 });
  }
}

// 处理删除请求
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const configParam = url.searchParams.get('config');
    
    // 解析配置
    let config: R2Config;
    
    if (configParam) {
      try {
        config = JSON.parse(decodeURIComponent(configParam)) as R2Config;
      } catch {
        return NextResponse.json({ error: '配置参数无效' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
    }
    
    // 验证配置
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      return NextResponse.json({ error: '配置不完整' }, { status: 400 });
    }
    
    // 验证键
    if (!key) {
      return NextResponse.json({ error: '缺少键参数' }, { status: 400 });
    }
    
    // 创建 S3 客户端
    const s3 = getR2Client(config);
    
    // 执行删除操作
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key
    });
    
    await s3.send(command);
    
    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('删除错误:', error);
    return NextResponse.json({ error: '删除文件时出错' }, { status: 500 });
  }
}

// 处理批量删除
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const configParam = url.searchParams.get('config');
    
    // 解析配置
    let config: R2Config;
    
    if (configParam) {
      try {
        config = JSON.parse(decodeURIComponent(configParam)) as R2Config;
      } catch {
        return NextResponse.json({ error: '配置参数无效' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
    }
    
    // 验证配置
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      return NextResponse.json({ error: '配置不完整' }, { status: 400 });
    }
    
    // 创建 S3 客户端
    const s3 = getR2Client(config);
    
    if (action === 'deleteMultiple') {
      const body = await request.json();
      const keys = body.keys;
      
      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return NextResponse.json({ error: '缺少要删除的键' }, { status: 400 });
      }
      
      // 准备批量删除对象
      const deleteObjects = {
        Bucket: config.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false
        }
      };
      
      const command = new DeleteObjectsCommand(deleteObjects);
      const result = await s3.send(command);
      
      return NextResponse.json({
        success: true, 
        deleted: result.Deleted?.map(obj => obj.Key) || [],
        errors: result.Errors || []
      });
    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('批量操作错误:', error);
    return NextResponse.json({ error: '执行批量操作时出错' }, { status: 500 });
  }
} 