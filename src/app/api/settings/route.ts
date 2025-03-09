import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 配置接口
interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// 配置文件的路径
const CONFIG_FILE_PATH = path.join(process.cwd(), '.r2-config.json');

// 默认配置（从环境变量中获取）
const DEFAULT_CONFIG: R2Config = {
  endpoint: process.env.R2_ENDPOINT || '',
  region: process.env.R2_REGION || 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || '',
};

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
  
  return DEFAULT_CONFIG;
}

// 保存配置
function saveConfig(config: R2Config): boolean {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving config file:', error);
    return false;
  }
}

// GET: 获取当前配置
export async function GET() {
  const config = readConfig();
  
  // 部分隐藏敏感信息
  const safeConfig = {
    ...config,
    secretAccessKey: config.secretAccessKey ? '********' : '',
  };
  
  return NextResponse.json({ config: safeConfig });
}

// POST: 保存配置
export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json();
    
    if (!config) {
      return NextResponse.json({ error: 'Invalid config data' }, { status: 400 });
    }
    
    // 验证配置
    if (!config.endpoint) {
      return NextResponse.json({ error: 'Endpoint URL is required' }, { status: 400 });
    }
    
    if (!config.accessKeyId) {
      return NextResponse.json({ error: 'Access Key ID is required' }, { status: 400 });
    }
    
    if (!config.secretAccessKey && config.secretAccessKey !== '********') {
      return NextResponse.json({ error: 'Secret Access Key is required' }, { status: 400 });
    }
    
    if (!config.bucketName) {
      return NextResponse.json({ error: 'Bucket name is required' }, { status: 400 });
    }
    
    // 如果密钥是隐藏的，保留原始密钥
    const currentConfig = readConfig();
    if (config.secretAccessKey === '********') {
      config.secretAccessKey = currentConfig.secretAccessKey;
    }
    
    // 保存配置
    const saved = saveConfig(config);
    
    if (saved) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 