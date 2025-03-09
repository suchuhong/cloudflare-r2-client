# Cloudflare R2 客户端

一个使用 Next.js 和 shadcn/ui 构建的 Cloudflare R2 存储客户端，提供文件浏览、上传、下载和删除功能。

## 功能特点

- 📁 浏览 R2 存储桶中的文件和文件夹
- 📤 上传文件到当前目录
- 📥 下载文件（生成预签名 URL）
- 🗑️ 删除单个或多个文件
- 🔍 搜索文件
- 👁️ 预览图片、视频、音频和 PDF 文件

## 技术栈

- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 样式
- [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/) - 与 R2 交互（R2 兼容 S3 API）
- [Sonner](https://sonner.emilkowal.ski/) - 通知组件

## 快速开始

### 前提条件

- Node.js 18+ 和 npm
- Cloudflare R2 存储桶和访问凭证

### 安装

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/cloudflare-r2-client.git
cd cloudflare-r2-client
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：

复制 `.env.local.example` 文件为 `.env.local` 并填入你的 Cloudflare R2 凭证：

```
R2_ENDPOINT=https://xxxxxxxxxxxx.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

4. 启动开发服务器：

```bash
npm run dev
```

5. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 部署

该应用可以部署到任何支持 Next.js 的平台，如 Vercel、Netlify 或自托管服务器。

### 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fcloudflare-r2-client)

记得在 Vercel 项目设置中添加环境变量。

## 许可证

MIT
