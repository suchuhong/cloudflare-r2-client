# Cloudflare R2 客户端

一个使用 Next.js 和 shadcn/ui 构建的 Cloudflare R2 存储客户端，提供文件浏览、上传、下载和删除功能。配置信息安全存储在浏览器中，完全静态部署，无需服务器权限。

## 功能特点

- 📁 浏览 R2 存储桶中的文件和文件夹
- 📤 上传文件到当前目录
- 📁 创建新文件夹
- 📥 下载文件（生成预签名 URL）
- 🗑️ 删除单个或多个文件
- 🔍 搜索文件
- 👁️ 预览图片、视频、音频和 PDF 文件
- 🖼️ 图片集视图和轮播预览
- 🔍 图片缩放、全屏和轮播功能
- 🌓 支持亮色/暗色主题切换
- 🔑 安全存储配置（仅保存在本地浏览器中）
- ⚙️ 图形化设置页面配置 R2 凭证
- 📊 侧边栏导航，轻松切换页面
- 🛠️ 开发模式下的调试工具

## 技术栈

- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 样式
- [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/) - 与 R2 交互（R2 兼容 S3 API）
- [Sonner](https://sonner.emilkowal.ski/) - 通知组件
- [next-themes](https://github.com/pacocoursey/next-themes) - 主题管理

## 演示

[演示链接](https://cloudflare-r2-client-git-main-suchs-projects-a2322d78.vercel.app/)

[封面](./img/image1.png)

[封面](./img/image2.png)

[设置](./img/image3.png)


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

本应用使用浏览器的 localStorage 安全存储您的 Cloudflare R2 凭证，无需服务器端配置文件：

### 通过 Web 界面设置

1. 启动应用后，点击侧边栏中的"设置"图标
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

### 关于配置的安全存储

- 您的 R2 凭证**仅存储在浏览器的 localStorage 中**，不会发送到任何第三方服务器
- 您可以通过清除浏览器数据随时删除存储的凭证
- 在开发环境中，应用提供额外的调试工具，生产环境中这些工具不可见
- 敏感信息（如访问密钥）在日志和调试输出中会被遮蔽

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

### 图片预览功能

- **图片缩略图**：在文件列表中直接显示图片的缩略图
- **图片集视图**：点击顶部的"图片集"按钮切换到图片网格视图
- **图片预览**：点击任意图片查看大图，支持以下功能：
  - 缩放：使用 + 和 - 按钮或键盘快捷键 (+/-)
  - 平移：在放大状态下拖动图片
  - 全屏：点击全屏按钮或按 F 键
  - 重置缩放：点击百分比数值或按 0 键
- **图片轮播**：预览图片时，可使用左右箭头按钮或键盘方向键浏览所有图片
- **缩略图导航**：在轮播模式下底部显示所有图片的缩略图，可点击快速跳转
- **关闭预览**：点击预览右上角的关闭按钮、按ESC键或点击背景区域可关闭预览

### 导航

应用程序左侧的侧边栏提供了快速导航功能：
- 点击"文件浏览器"图标转到主页
- 点击"设置"图标打开设置页面
- 侧边栏底部的主题切换按钮可切换亮/暗模式

### 调试功能（仅开发环境）

在开发环境中（`npm run dev`），应用提供额外的调试工具：
- 设置页面中的调试信息按钮
- 详细的控制台日志
- 诊断功能

## 开发与生产环境

本应用在开发环境和生产环境中行为有所不同：

### 开发环境 (`npm run dev`)

- 显示详细的调试日志，帮助开发者快速定位问题
- 在设置页面提供额外的调试信息面板
- 主页提供诊断功能按钮（仅开发人员使用）
- 控制台输出详细的 API 请求和响应信息

### 生产环境 (`npm run build` 和 `npm start`)

- 移除所有调试工具和诊断功能
- 不显示调试日志，减少控制台输出
- 更加精简高效，专注于用户体验
- 保持相同的核心功能，但移除开发辅助功能

这种区分确保开发人员拥有良好的调试体验，同时为最终用户提供更加简洁高效的应用界面。

## 部署

该应用可以部署到任何支持 Next.js 的平台，完全支持静态部署。

### 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fcloudflare-r2-client)

### 部署到 Netlify

此应用支持完全静态部署，可直接部署到 Netlify、GitHub Pages 等静态托管服务。

## 许可证

MIT
