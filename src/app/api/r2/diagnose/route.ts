import { NextResponse } from 'next/server';
import { S3Client, ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import os from 'os';

// 配置文件的路径
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'r2-config.json');

// 配置接口
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
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  
  return {
    endpoint: '',
    region: 'auto',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: ''
  };
}

export async function GET() {
  try {
    // 系统环境信息
    const systemInfo = {
      platform: process.platform,
      cwd: process.cwd(),
      workingDir: CONFIG_DIR,
      configPath: CONFIG_FILE_PATH,
      tempDir: os.tmpdir(),
      nodeVersion: process.version,
      configExists: fs.existsSync(CONFIG_FILE_PATH),
      dirExists: fs.existsSync(CONFIG_DIR),
    };
    
    // 配置信息（隐藏敏感部分）
    const config = readConfig();
    const safeConfig = {
      ...config,
      accessKeyId: config.accessKeyId ? '********' : '',
      secretAccessKey: config.secretAccessKey ? '********' : '',
    };
    
    // 尝试连接 R2
    let connectionTest = { success: false, message: '', objects: [] };
    
    if (config.endpoint && config.accessKeyId && config.secretAccessKey && config.bucketName) {
      try {
        // 创建S3客户端
        const client = new S3Client({
          region: config.region,
          endpoint: config.endpoint,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          forcePathStyle: true,
        });
        
        // 尝试列出存储桶
        const bucketCommand = new ListBucketsCommand({});
        const bucketResponse = await client.send(bucketCommand);
        
        // 尝试列出对象
        const listCommand = new ListObjectsV2Command({
          Bucket: config.bucketName,
          MaxKeys: 10, // 限制返回对象数量
        });
        
        const listResponse = await client.send(listCommand);
        
        connectionTest = {
          success: true,
          message: 'Successfully connected to R2',
          objects: listResponse.Contents?.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          })) || [],
        };
      } catch (error: any) {
        connectionTest = {
          success: false,
          message: `Connection error: ${error.message || 'Unknown error'}`,
          objects: [],
        };
      }
    } else {
      connectionTest = {
        success: false,
        message: 'Incomplete configuration',
        objects: [],
      };
    }
    
    return NextResponse.json({
      systemInfo,
      config: safeConfig,
      connectionTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: `Diagnostic error: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 