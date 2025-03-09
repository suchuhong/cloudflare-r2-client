import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

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
    console.log(`[R2诊断] ${message}`, data || '');
  }
};

// POST API 路由处理函数
export async function POST(request: NextRequest) {
  let config: R2Config;
  
  try {
    // 解析请求中的配置
    const requestData = await request.json();
    config = requestData as R2Config;
    
    logDebug('开始诊断测试，配置:', {
      endpoint: config.endpoint,
      region: config.region,
      bucketName: config.bucketName,
      // 不记录敏感凭证
      hasAccessKey: !!config.accessKeyId,
      hasSecretKey: !!config.secretAccessKey
    });
    
    // 验证配置
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      logDebug('配置不完整');
      return NextResponse.json({
        success: false,
        message: "配置不完整，请检查所有必填字段"
      }, { status: 400 });
    }

    // 创建 S3 客户端
    const s3Client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    
    // 测试连接 - 直接访问指定的存储桶
    try {
      logDebug(`尝试访问存储桶: ${config.bucketName}`);
      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: config.bucketName,
        MaxKeys: 5,
        Delimiter: '/'
      });
      
      const listResult = await s3Client.send(listObjectsCommand);
      
      // 提取前几个文件作为示例
      const objects = [];
      
      if (listResult.Contents) {
        for (const item of listResult.Contents.slice(0, 5)) {
          objects.push({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified
          });
        }
      }
      
      // 成功连接并列出文件
      logDebug('连接测试成功', {
        filesCount: listResult.Contents?.length || 0,
        foldersCount: listResult.CommonPrefixes?.length || 0
      });
      
      return NextResponse.json({
        success: true,
        message: `成功连接到 ${config.bucketName} 存储桶，可以访问 ${listResult.Contents?.length || 0} 个文件和 ${listResult.CommonPrefixes?.length || 0} 个文件夹`,
        objects
      });
    } catch (error) {
      const typedError = error as Error;
      logDebug('连接测试失败', typedError);
      
      return NextResponse.json({
        success: false,
        message: `连接测试失败: ${typedError.message}`
      }, { status: 500 });
    }
    
  } catch (error) {
    const typedError = error as Error;
    logDebug('API 请求处理错误', typedError);
    
    return NextResponse.json({
      success: false,
      message: `请求处理错误: ${typedError.message}`
    }, { status: 500 });
  }
} 