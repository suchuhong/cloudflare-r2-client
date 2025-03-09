import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 或者使用 remotePatterns 更灵活地配置
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
