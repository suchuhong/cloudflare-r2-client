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

// 配置文件的路径
const CONFIG_FILE_PATH = path.join(process.cwd(), '.r2-config.json');

// 默认配置（从环境变量中获取）
const DEFAULT_CONFIG = {
  endpoint: process.env.R2_ENDPOINT || '',
  region: process.env.R2_REGION || 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || '',
};

// 读取配置
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  
  return DEFAULT_CONFIG;
}

// 定义R2配置接口
interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// 获取R2配置
const r2Config: R2Config = readConfig();

// 检查配置是否有效
function isR2ConfigValid(): boolean {
  return Boolean(
    r2Config.endpoint &&
    r2Config.accessKeyId &&
    r2Config.secretAccessKey &&
    r2Config.bucketName
  );
}

// 创建S3客户端
function getR2Client() {
  return new S3Client({
    region: r2Config.region,
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
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
        const client = getR2Client();
        const command = new ListObjectsV2Command({ 
          Bucket: r2Config.bucketName,
          Prefix: prefix 
        });
        
        const response = await client.send(command);
        
        const objects = response.Contents 
          ? response.Contents.map(item => ({
              key: item.Key || '',
              size: item.Size || 0,
              lastModified: item.LastModified || new Date(),
              etag: item.ETag
            }))
          : [];
          
        return NextResponse.json({ objects });
      }
      
      case 'getSignedUrl': {
        if (!key) {
          return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        const client = getR2Client();
        const command = new GetObjectCommand({
          Bucket: r2Config.bucketName,
          Key: key,
        });
        
        const expiresIn = parseInt(searchParams.get('expiresIn') || '3600', 10);
        const url = await getSignedUrl(client, command, { expiresIn });
        
        return NextResponse.json({ url });
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
        const command = new PutObjectCommand({
          Bucket: r2Config.bucketName,
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
        const command = new DeleteObjectCommand({
          Bucket: r2Config.bucketName,
          Key: key,
        });
        
        await client.send(command);
        return NextResponse.json({ success: true });
      }
      
      case 'deleteObjects': {
        const { keys } = await request.json();
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json({ error: 'Keys array is required' }, { status: 400 });
        }

        const client = getR2Client();
        const objects = keys.map(key => ({ Key: key }));
        
        const command = new DeleteObjectsCommand({
          Bucket: r2Config.bucketName,
          Delete: { Objects: objects },
        });
        
        await client.send(command);
        return NextResponse.json({ success: true });
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
    const client = getR2Client();
    
    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      Body: Buffer.from(fileBuffer),
      ContentType: contentType,
    });
    
    await client.send(command);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 