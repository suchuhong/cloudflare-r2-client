import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 配置文件的路径
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'r2-config.json');

export async function GET() {
  try {
    // 检查配置目录是否存在
    const dirExists = fs.existsSync(CONFIG_DIR);
    
    // 检查配置文件是否存在
    const fileExists = fs.existsSync(CONFIG_FILE_PATH);
    
    // 获取文件信息
    let fileStats = null;
    let fileContent = null;
    
    if (fileExists) {
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
      } catch (_) {
        fileContent = { error: 'Failed to parse config file' };
      }
    }
    
    // 获取系统信息
    const systemInfo = {
      platform: process.platform,
      cwd: process.cwd(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      username: os.userInfo().username,
    };
    
    return NextResponse.json({
      configDir: {
        path: CONFIG_DIR,
        exists: dirExists,
        isWritable: dirExists ? fs.accessSync(CONFIG_DIR, fs.constants.W_OK) || true : false,
      },
      configFile: {
        path: CONFIG_FILE_PATH,
        exists: fileExists,
        stats: fileStats,
        content: fileContent,
      },
      systemInfo,
    });
  } catch (error) {
    console.error('Error getting config status:', error);
    return NextResponse.json({ error: 'Failed to get config status' }, { status: 500 });
  }
} 