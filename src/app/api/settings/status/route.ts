import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 配置接口
interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// 配置文件的路径
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'r2-config.json');

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
    
    // 判断目录是否可写
    let isDirWritable = false;
    if (fs.existsSync(CONFIG_DIR)) {
      try {
        fs.accessSync(CONFIG_DIR, fs.constants.W_OK);
        isDirWritable = true;
      } catch {
        isDirWritable = false;
      }
    }
    
    // 配置信息（隐藏敏感部分）
    const config = readConfig();
    const safeConfig = {
      ...config,
      accessKeyId: config.accessKeyId ? '********' : '',
      secretAccessKey: config.secretAccessKey ? '********' : '',
    };
    
    // 尝试连接 R2
    let fileStats = null;
    let fileContent = null;
    
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      fileStats = fs.statSync(CONFIG_FILE_PATH);
      try {
        const rawContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        const parsedContent = JSON.parse(rawContent);
        // 隐藏敏感信息
        fileContent = {
          ...parsedContent,
          accessKeyId: parsedContent.accessKeyId ? '********' : '',
          secretAccessKey: parsedContent.secretAccessKey ? '********' : '',
        };
      } catch {
        // 忽略错误，只提供错误消息
        fileContent = { error: 'Failed to parse config file' };
      }
    }
    
    return NextResponse.json({
      configDir: {
        path: CONFIG_DIR,
        exists: fs.existsSync(CONFIG_DIR),
        isWritable: isDirWritable,
      },
      configFile: {
        path: CONFIG_FILE_PATH,
        exists: fs.existsSync(CONFIG_FILE_PATH),
        stats: fileStats,
        content: fileContent,
      },
      systemInfo,
      config: safeConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting config status:', error);
    return NextResponse.json({ error: 'Failed to get config status' }, { status: 500 });
  }
} 