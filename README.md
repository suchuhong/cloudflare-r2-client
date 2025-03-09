# Cloudflare R2 客户端

一个使用 Next.js 和 shadcn/ui 构建的 Cloudflare R2 存储客户端，提供文件浏览、上传、下载和删除功能。

## 功能特点

- 📁 浏览 R2 存储桶中的文件和文件夹
- 📤 上传文件到当前目录
- 📁 创建新文件夹
- 📥 下载文件（生成预签名 URL）
- 🗑️ 删除单个或多个文件
- 🔍 搜索文件
- 👁️ 预览图片、视频、音频和 PDF 文件
- 🌓 支持亮色/暗色主题切换
- ⚙️ 图形化设置页面配置 R2 凭证

## 技术栈

- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 样式
- [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/) - 与 R2 交互（R2 兼容 S3 API）
- [Sonner](https://sonner.emilkowal.ski/) - 通知组件
- [next-themes](https://github.com/pacocoursey/next-themes) - 主题管理

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

3. 启动开发服务器：

```bash
npm run dev
```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

5. 在设置页面配置 R2 凭证

## 配置方式

本应用提供两种配置 Cloudflare R2 凭证的方式：

### 方法 1：通过 Web 界面设置（推荐）

1. 启动应用后，点击右上角的"设置"按钮
2. 在设置页面填写以下信息：
   - 端点 URL（例如：https://xxxxx.r2.cloudflarestorage.com）
   - 区域（通常为 auto）
   - 访问密钥 ID
   - 秘密访问密钥
   - 存储桶名称
3. 点击"测试连接"确认配置有效
4. 点击"保存配置"应用设置

> **提示**：在 Cloudflare R2 中获取配置信息的步骤：
> 1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
> 2. 选择 "R2" 选项
> 3. 创建或选择一个存储桶，记下存储桶名称
> 4. 在 "R2 设置" 中创建 API 令牌（需要有 "对象读取"和"对象写入"权限）
> 5. 复制生成的"访问密钥 ID"和"秘密访问密钥"
> 6. 端点 URL 格式为 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`，其中 `<ACCOUNT_ID>` 可在 Cloudflare 控制台 "R2" 部分的 API 端点中找到

### 方法 2：使用环境变量

复制 `.env.local.example` 文件为 `.env.local` 并填入你的 Cloudflare R2 凭证：

```
R2_ENDPOINT=https://xxxxxxxxxxxx.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

## 功能使用指南

### 文件浏览

- 点击文件夹名称进入该文件夹
- 点击"Go up"返回上一级目录
- 使用搜索框过滤文件

### 文件操作

- **上传文件**：点击"上传"按钮，选择文件并确认
- **创建文件夹**：点击"新建文件夹"按钮，输入文件夹名称并确认
- **下载文件**：点击文件打开预览，然后点击"下载"按钮
- **删除文件**：
  - 单个文件：打开文件预览，点击"删除"按钮
  - 多个文件：勾选要删除的文件，然后点击"删除选中"按钮

### 主题切换

点击右上角的太阳/月亮图标切换亮色/暗色主题。

## 部署

该应用可以部署到任何支持 Next.js 的平台，如 Vercel、Netlify 或自托管服务器。

### 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fcloudflare-r2-client)

如果使用环境变量方式配置，记得在 Vercel 项目设置中添加环境变量。

## 许可证

MIT
