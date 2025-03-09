import { NextResponse } from 'next/server';
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
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'r2-config.json');

// 读取配置（返回原始值，不掩码）
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
    bucketName: '',
  };
}

// GET: 获取当前配置（内部使用，包含原始秘钥）
export async function GET() {
  // 此端点仅供内部使用，不直接暴露给用户
  // 在实际生产环境中，应当添加适当的认证和授权机制
  
  const config = readConfig();
  
  // 返回完整配置，包括敏感信息
  // 注意：在生产环境中，应确保此端点受到适当保护
  return NextResponse.json({ config });
} 