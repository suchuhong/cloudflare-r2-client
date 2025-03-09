import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand, S3ServiceException } from '@aws-sdk/client-s3';

// R2 配置接口定义在这里供类型检查使用
export interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// 定义扩展的错误类型
interface S3ExtendedError extends S3ServiceException {
  $metadata?: {
    httpStatusCode?: number;
  };
  name?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json() as { config: R2Config };
    
    if (!config || !config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      return NextResponse.json({ error: '配置信息不完整' }, { status: 400 });
    }

    // 创建临时客户端测试连接
    const client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // 强制使用路径样式寻址模式，避免一些签名问题
      forcePathStyle: true,
    });

    try {
      // 使用 HeadBucket 检查存储桶是否存在，比 ListBuckets 更精确
      // 并且更常用于 R2 等 S3 兼容服务
      const command = new HeadBucketCommand({
        Bucket: config.bucketName
      });
      
      await client.send(command);
      return NextResponse.json({ success: true });
    } catch (error) {
      // 检查细分错误类型
      const err = error as S3ExtendedError;
      if (err.$metadata?.httpStatusCode === 403) {
        return NextResponse.json({ 
          error: '认证失败：没有访问该存储桶的权限。请检查您的访问密钥和密钥。' 
        }, { status: 403 });
      } else if (err.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ 
          error: `存储桶 "${config.bucketName}" 不存在` 
        }, { status: 404 });
      } else if (err.name === 'SignatureDoesNotMatch') {
        return NextResponse.json({ 
          error: '签名不匹配：请确保您提供的访问密钥和密钥正确无误' 
        }, { status: 403 });
      } else {
        console.error('详细测试连接错误:', err);
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        return NextResponse.json({ error: `连接测试失败: ${errorMessage}` }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('测试连接请求处理错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 