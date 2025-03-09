import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      // 添加你的 Cloudflare R2 域名，例如：
      // 'pub-xxxxxxxxxxxxxxxx.r2.dev',
      // 如果你使用自定义域名，也添加进来
      // 'your-custom-domain.com',
      // 如果不确定域名，可以添加更广泛的域名
      'r2.dev'
    ],
    // 或者使用 remotePatterns 更灵活地配置
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
};

export default nextConfig;
