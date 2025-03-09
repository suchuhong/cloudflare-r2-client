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
import fs from 'fs';
import path from 'path';

// 配置文件的路径 - 使用更可靠的路径
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'r2-config.json');

// 确保配置目录存在
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating config directory:', error);
    }
  }
}

// 默认配置（从环境变量中获取）
const DEFAULT_CONFIG = {
  endpoint: process.env.R2_ENDPOINT || '',
  region: process.env.R2_REGION || 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || '',
};

// 定义配置接口
interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// 读取配置
function readConfig(): R2Config {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  
  return DEFAULT_CONFIG as R2Config;
}

// 检查配置是否有效
function isR2ConfigValid(): boolean {
  const config = readConfig(); // 每次检查都重新读取配置
  return Boolean(
    config.endpoint &&
    config.accessKeyId &&
    config.secretAccessKey &&
    config.bucketName
  );
}

// 创建S3客户端
function getR2Client() {
  const config = readConfig(); // 每次创建客户端都重新读取配置
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function GET(request: NextRequest) {
  // 检查配置是否有效
  if (!isR2ConfigValid()) {
    return NextResponse.json(
      { 
        error: 'R2 configuration is incomplete',
        isValid: false
      }, 
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const prefix = searchParams.get('prefix') || '';
  const key = searchParams.get('key') || '';

  try {
    // 处理不同的操作
    switch (action) {
      case 'checkConfig': {
        return NextResponse.json({ isValid: true });
      }
      
      case 'listObjects': {
        const result = [];
        const commonPrefixes = new Set<string>();
        
        if (isR2ConfigValid()) {
          try {
            const client = getR2Client();
            const config = readConfig(); // 获取配置
            const command = new ListObjectsV2Command({ 
              Bucket: config.bucketName,
              Prefix: prefix,
              Delimiter: '/' // 使用分隔符获取分层结构
            });
            
            const response = await client.send(command);
            
            // 处理文件夹（CommonPrefixes）
            if (response.CommonPrefixes) {
              for (const commonPrefix of response.CommonPrefixes) {
                if (commonPrefix.Prefix) {
                  commonPrefixes.add(commonPrefix.Prefix);
                  result.push({
                    key: commonPrefix.Prefix,
                    size: 0,
                    lastModified: new Date(),
                    isFolder: true
                  });
                }
              }
            }
            
            // 处理文件
            if (response.Contents) {
              for (const content of response.Contents) {
                // 跳过表示文件夹的空对象和当前前缀本身
                if (content.Key && 
                    content.Key !== prefix && 
                    !commonPrefixes.has(content.Key) &&
                    !(content.Key.endsWith('/') && content.Size === 0)) {
                    
                  result.push({
                    key: content.Key,
                    size: content.Size || 0,
                    lastModified: content.LastModified || new Date(),
                    etag: content.ETag,
                    isFolder: content.Key.endsWith('/') && content.Size === 0
                  });
                }
              }
            }
            
            return NextResponse.json({ 
              objects: result,  // 使用objects作为键以匹配前端期望
              prefix: prefix
            });
          } catch (error) {
            console.error("Error listing objects:", error);
            return NextResponse.json(
              { error: "Failed to list objects" }, 
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { 
              error: "R2 configuration is incomplete",
              isValid: false
            }, 
            { status: 500 }
          );
        }
      }
      
      case 'getSignedUrl': {
        if (!key) {
          return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        const client = getR2Client();
        const config = readConfig(); // 获取配置
        const command = new GetObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        });
        
        const expiresIn = parseInt(searchParams.get('expiresIn') || '3600', 10);
        const url = await getSignedUrl(client, command, { expiresIn });
        
        // 保持和前端期望的响应格式一致
        return NextResponse.json({ signedUrl: url });
      }
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('R2 API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // 检查配置是否有效
  if (!isR2ConfigValid()) {
    return NextResponse.json(
      { error: 'R2 configuration is incomplete' }, 
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'createFolder': {
        const { key } = await request.json();
        if (!key) {
          return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        // 确保路径以斜杠结尾，表示这是一个文件夹
        const folderKey = key.endsWith('/') ? key : `${key}/`;
        
        const client = getR2Client();
        const config = readConfig(); // 获取配置
        const command = new PutObjectCommand({
          Bucket: config.bucketName,
          Key: folderKey,
          Body: '', // 空内容，仅用于标记是一个文件夹
          ContentType: 'application/x-directory',
        });
        
        await client.send(command);
        return NextResponse.json({ success: true });
      }
      
      case 'deleteObject': {
        const { key } = await request.json();
        if (!key) {
          return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        const client = getR2Client();
        const config = readConfig(); // 获取配置
        const command = new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        });
        
        try {
          await client.send(command);
          return NextResponse.json({ success: true });
        } catch (deleteError: unknown) {
          console.error('Delete object error:', deleteError);
          
          // 处理常见错误
          const err = deleteError as { Code?: string; name?: string; message?: string };
          
          // 处理访问权限错误
          if (err.name === 'AccessDenied' || err.Code === 'AccessDenied') {
            return NextResponse.json({ 
              error: '当前账号没有删除权限，请检查 R2 API 令牌的权限设置', 
              errorCode: 'ACCESS_DENIED',
              detail: '您的 Cloudflare R2 API 令牌需要具有"对象写入"权限才能删除文件'
            }, { status: 403 });
          }
          
          // 其他 S3 错误
          if (err.Code) {
            return NextResponse.json({ 
              error: `删除失败: ${err.Code}`, 
              errorCode: err.Code,
              detail: err.message || '未知错误'
            }, { status: 500 });
          }
          
          // 一般错误
          return NextResponse.json({ 
            error: '删除失败', 
            detail: err.message || '未知错误'
          }, { status: 500 });
        }
      }
      
      case 'deleteObjects': {
        const { keys } = await request.json();
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json({ error: 'Keys array is required' }, { status: 400 });
        }

        const client = getR2Client();
        const config = readConfig(); // 获取配置
        const objects = keys.map(key => ({ Key: key }));
        
        const command = new DeleteObjectsCommand({
          Bucket: config.bucketName,
          Delete: { Objects: objects },
        });
        
        try {
          await client.send(command);
          return NextResponse.json({ success: true });
        } catch (deleteError: unknown) {
          console.error('Delete objects error:', deleteError);
          
          // 处理常见错误
          const err = deleteError as { Code?: string; name?: string; message?: string };
          
          // 处理访问权限错误
          if (err.name === 'AccessDenied' || err.Code === 'AccessDenied') {
            return NextResponse.json({ 
              error: '当前账号没有删除权限，请检查 R2 API 令牌的权限设置', 
              errorCode: 'ACCESS_DENIED',
              detail: '您的 Cloudflare R2 API 令牌需要具有"对象写入"权限才能删除文件'
            }, { status: 403 });
          }
          
          // 其他 S3 错误
          if (err.Code) {
            return NextResponse.json({ 
              error: `批量删除失败: ${err.Code}`, 
              errorCode: err.Code,
              detail: err.message || '未知错误'
            }, { status: 500 });
          }
          
          // 一般错误
          return NextResponse.json({ 
            error: '批量删除失败', 
            detail: err.message || '未知错误'
          }, { status: 500 });
        }
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('R2 API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// 处理上传文件的请求 (使用 PUT 方法)
export async function PUT(request: NextRequest) {
  // 检查配置是否有效
  if (!isR2ConfigValid()) {
    return NextResponse.json(
      { error: 'R2 configuration is incomplete' }, 
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const contentType = searchParams.get('contentType') || 'application/octet-stream';
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const fileBuffer = await request.arrayBuffer();
    
    try {
      const client = getR2Client();
      const config = readConfig(); // 获取配置
      
      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: Buffer.from(fileBuffer),
        ContentType: contentType,
      });
      
      await client.send(command);
      return NextResponse.json({ success: true });
    } catch (uploadError: unknown) {
      console.error('R2 Upload error:', uploadError);
      
      // 处理访问权限错误
      const err = uploadError as { Code?: string; name?: string; message?: string };
      
      if (err.name === 'AccessDenied' || err.Code === 'AccessDenied') {
        return NextResponse.json({ 
          error: '当前账号没有上传权限，请检查 R2 API 令牌的权限设置', 
          errorCode: 'ACCESS_DENIED',
          detail: '您的 Cloudflare R2 API 令牌需要具有"对象写入"权限才能上传文件'
        }, { status: 403 });
      }
      
      // 其他 S3 错误
      if (err.Code) {
        return NextResponse.json({ 
          error: `上传失败: ${err.Code}`, 
          errorCode: err.Code,
          detail: err.message || '未知错误'
        }, { status: 500 });
      }
      
      // 一般错误
      return NextResponse.json({ 
        error: '上传失败', 
        errorCode: 'UPLOAD_FAILED',
        detail: err.message || '未知错误'
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Request processing error:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ 
      error: '处理上传请求时出错', 
      detail: errorMessage
    }, { status: 500 });
  }
} 