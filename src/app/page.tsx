"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { FileExplorer } from "@/components/file-explorer";
import { UploadDialog } from "@/components/upload-dialog";
import { FilePreview } from "@/components/file-preview";
import { R2Object } from "@/lib/r2-types";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/config-context";
import { Loading } from "@/components/loading";
import { LayoutWithSidebar } from "@/components/layout-with-sidebar";
import { ImageCarousel } from "@/components/image-carousel";
import { ImageGrid } from "@/components/image-grid";

export default function Home() {
  const { isConfigValid, isLoading: isConfigLoading, config } = useConfig();
  
  const [files, setFiles] = useState<R2Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<R2Object | null>(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<R2Object[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showImageCarousel, setShowImageCarousel] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 添加开发模式检测
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!config) {
        toast.error("请先完成 R2 配置");
        setIsLoading(false);
        return;
      }
      
      console.log(`Loading files from prefix: "${currentPrefix}"`);
      
      // 将配置序列化并编码以传递给API
      const configParam = encodeURIComponent(JSON.stringify(config));
      
      const response = await fetch(
        `/api/r2?action=listObjects&prefix=${encodeURIComponent(currentPrefix)}&config=${configParam}`
      );
      const data = await response.json();
      
      if (response.ok) {
        console.log("API response:", data);
        
        // 将接收到的日期字符串转换回 Date 对象
        const filesWithDates = (data.objects || []).map((file: Omit<R2Object, 'lastModified'> & { lastModified: string }) => ({
          ...file,
          lastModified: new Date(file.lastModified)
        }));
        
        setFiles(filesWithDates);
        console.log("Processed files:", filesWithDates);
        
        // 过滤出图片文件
        const imgExts = ["jpg", "jpeg", "png", "gif", "webp"];
        const imgFiles = filesWithDates.filter((file: R2Object) => {
          const ext = file.key.split('.').pop()?.toLowerCase() || '';
          return !file.isFolder && imgExts.includes(ext);
        });
        
        setImageFiles(imgFiles);
        console.log("Image files:", imgFiles);
        
        // 如果有图片文件，加载它们的预签名URL
        if (imgFiles.length > 0) {
          loadImageUrls();
        }
      } else {
        console.error("API error:", data);
        toast.error("加载文件失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error loading files:", error);
      toast.error("加载文件失败");
    } finally {
      setIsLoading(false);
    }
  }, [currentPrefix, config]);

  // 获取签名 URL
  const getSignedUrl = useCallback(async (fileKey: string) => {
    if (!config) return "";
    
    try {
      const configParam = encodeURIComponent(JSON.stringify(config));
      const response = await fetch(`/api/r2?action=getSignedUrl&key=${encodeURIComponent(fileKey)}&config=${configParam}`);
      
      if (!response.ok) {
        throw new Error("获取签名URL失败");
      }
      
      const data = await response.json();
      return data.signedUrl || "";
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast.error("获取预览链接失败");
      return "";
    }
  }, [config]);

  // 加载图片 URL
  const loadImageUrls = useCallback(async () => {
    if (!Array.isArray(imageFiles) || imageFiles.length === 0 || !config) return;
    
    const urls: { [key: string]: string } = {};
    const loadPromises = imageFiles.map(async (file) => {
      try {
        if (file.isFolder) return; // 跳过文件夹
        
        const url = await getSignedUrl(file.key);
        if (url) {
          urls[file.key] = url;
        }
      } catch (error) {
        console.error(`Error loading URL for ${file.key}:`, error);
      }
    });
    
    await Promise.all(loadPromises);
    setImageUrls(urls);
  }, [imageFiles, config, getSignedUrl]);

  // 当配置或前缀改变时加载文件
  useEffect(() => {
    if (isConfigValid) {
      loadFiles();
    }
  }, [isConfigValid, currentPrefix, loadFiles]);

  // 当文件列表改变时加载图片URL
  useEffect(() => {
    if (files.length > 0) {
      loadImageUrls();
    }
  }, [files, loadImageUrls]);

  // 文件点击处理
  const handleFileClick = async (file: R2Object) => {
    if (file.isFolder) {
      // 如果是文件夹，则导航到该文件夹
      setCurrentPrefix(file.key);
    } else {
      // 如果是文件，显示预览
      try {
        setSelectedFile(file);
        
        // 获取签名 URL
        const url = await getSignedUrl(file.key);
        setSignedUrl(url);
        
        // 检查是否是图片
        const fileName = file.key.split("/").pop() || "";
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
        
        if (isImage) {
          // 找到当前图片在图片文件数组中的索引
          const index = imageFiles.findIndex(img => img.key === file.key);
          if (index !== -1) {
            setCarouselIndex(index);
            setShowImageCarousel(true);
          }
        }
      } catch (error) {
        console.error('Error processing file click:', error);
        toast.error('获取文件预览失败');
      }
    }
  };

  // 处理上传文件
  const handleUpload = async (file: File, key: string) => {
    if (!config) {
      toast.error("请先完成 R2 配置");
      return;
    }
    
    try {
      // 显示上传进度通知
      toast.loading(`正在上传: ${file.name}`);
      
      // 获取文件完整路径
      const fullPath = currentPrefix + key;
      
      // 准备表单数据
      const formData = new FormData();
      formData.append('file', file);
      
      // 将配置序列化并编码以传递给API
      const configParam = encodeURIComponent(JSON.stringify(config));
      
      // 发送请求
      const response = await fetch(`/api/r2?action=upload&key=${encodeURIComponent(fullPath)}&config=${configParam}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '上传失败');
      }
      
      // 上传成功
      toast.success(`上传成功: ${file.name}`);
      loadFiles(); // 重新加载文件列表
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理删除文件
  const handleDelete = async (file: R2Object) => {
    if (!config) {
      toast.error("请先完成 R2 配置");
      return;
    }
    
    try {
      // 显示确认对话框
      if (!window.confirm(`确定要删除 "${file.key}" 吗?`)) {
        return;
      }
      
      toast.loading(`正在删除: ${file.key}`);
      
      // 将配置序列化并编码以传递给API
      const configParam = encodeURIComponent(JSON.stringify(config));
      
      // 发送删除请求
      const response = await fetch(`/api/r2?key=${encodeURIComponent(file.key)}&config=${configParam}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }
      
      // 删除成功
      toast.success(`删除成功: ${file.key}`);
      
      // 关闭预览并重新加载文件列表
      setSelectedFile(null);
      setSignedUrl("");
      loadFiles();
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理批量删除
  const handleBatchDelete = async (files: R2Object[]) => {
    if (!config) {
      toast.error("请先完成 R2 配置");
      return;
    }
    
    if (files.length === 0) {
      toast.error('未选择任何文件');
      return;
    }
    
    try {
      // 显示确认对话框
      if (!window.confirm(`确定要删除选中的 ${files.length} 个文件吗?`)) {
        return;
      }
      
      toast.loading(`正在删除 ${files.length} 个文件...`);
      
      // 获取文件键列表
      const keys = files.map(file => file.key);
      
      // 将配置序列化并编码以传递给API
      const configParam = encodeURIComponent(JSON.stringify(config));
      
      // 发送批量删除请求
      const response = await fetch(`/api/r2?action=deleteMultiple&config=${configParam}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '批量删除失败');
      }
      
      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        // 存在部分删除失败
        const errorCount = result.errors.length;
        toast.error(`删除完成，但有 ${errorCount} 个文件删除失败`);
      } else {
        // 全部删除成功
        toast.success(`成功删除 ${files.length} 个文件`);
      }
      
      // 重新加载文件列表
      loadFiles();
      
    } catch (error) {
      console.error('Batch delete error:', error);
      toast.error(`批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 创建文件夹
  const handleCreateFolder = async (folderName: string) => {
    if (!config) {
      toast.error("请先完成 R2 配置");
      return;
    }
    
    try {
      // 构建文件夹完整路径
      const folderPath = currentPrefix + folderName;
      
      // 将配置序列化并编码以传递给API
      const configParam = encodeURIComponent(JSON.stringify(config));
      
      // 发送创建文件夹请求
      const response = await fetch(`/api/r2?action=createFolder&key=${encodeURIComponent(folderPath)}&config=${configParam}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建文件夹失败');
      }
      
      // 创建成功
      toast.success(`创建文件夹成功: ${folderName}`);
      setShowNewFolderDialog(false);
      loadFiles(); // 重新加载文件列表
      
    } catch (error) {
      console.error('Create folder error:', error);
      toast.error(`创建文件夹失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 运行诊断
  const runDiagnostics = async () => {
    // 仅在开发环境中执行诊断
    if (!isDevelopment) {
      return;
    }
    
    try {
      if (!config) {
        toast.error("请先完成 R2 配置");
        return;
      }
      
      // 显示加载通知
      toast.loading("正在运行诊断...");
      
      // 发送诊断请求
      const response = await fetch('/api/r2/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`诊断成功: ${result.message}`);
        console.log('诊断结果:', result);
      } else {
        toast.error(`诊断失败: ${result.message}`);
      }
    } catch (error) {
      console.error('诊断错误:', error);
      toast.error(`诊断出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 计算预览模式下的图片文件
  const visibleImageFiles = useMemo(() => {
    if (viewMode === 'list') return [];
    
    return imageFiles.filter(file => {
      // 只显示当前目录下的图片，非子目录
      const relativePath = file.key.startsWith(currentPrefix) 
        ? file.key.slice(currentPrefix.length) 
        : file.key;
      
      return !relativePath.includes('/');
    });
  }, [viewMode, imageFiles, currentPrefix]);

  // 对于加载和错误状态，显示全屏幕消息
  if (isConfigLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loading text="正在加载配置..." />
      </div>
    );
  }

  if (!isConfigValid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
          <h1 className="text-2xl font-bold mb-4">配置不完整</h1>
          <p className="mb-4">
            R2 配置不完整。请在设置页面完成配置：
          </p>
          <div className="flex justify-center mt-4">
            <Button asChild>
              <a href="/settings">转到设置</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // 对于主内容，使用带侧边栏的布局
  return (
    <LayoutWithSidebar>
      <div className="p-4 md:p-8">
        <Toaster position="top-right" />
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">文件浏览器</h1>
            <div className="flex items-center">
              <p className="text-muted-foreground">
                {currentPrefix ? `当前目录: ${currentPrefix}` : "根目录"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-4 flex gap-2 justify-between">
          <div className="flex items-center gap-2">
            {/* 视图切换按钮 */}
            <Button
              variant={viewMode === 'list' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              列表
            </Button>
            
            <Button
              variant={viewMode === 'grid' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              图片集
            </Button>
            
            {/* 文件操作按钮 */}
            <Button 
              onClick={() => setShowNewFolderDialog(true)}
              variant="outline"
              size="sm"
              className="px-3 ml-4"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              新建文件夹
            </Button>
            
            <Button 
              onClick={() => setShowUploadDialog(true)}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              上传
            </Button>
          </div>
          
          {/* 诊断按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            className="ml-auto"
            title="运行 R2 诊断"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="8" />
            </svg>
            诊断
          </Button>
        </div>
        
        {viewMode === 'list' ? (
          <FileExplorer
            files={files}
            currentPrefix={currentPrefix}
            isLoading={isLoading}
            imageUrls={imageUrls}
            onFileClick={handleFileClick}
            onUploadClick={() => setShowUploadDialog(true)}
            onDeleteClick={handleBatchDelete}
            onNavigate={setCurrentPrefix}
            onRefresh={loadFiles}
          />
        ) : (
          <ImageGrid
            files={visibleImageFiles}
            imageUrls={imageUrls}
            onImageClick={handleFileClick}
            onViewListMode={() => setViewMode('list')}
          />
        )}
        
        {showUploadDialog && (
          <UploadDialog
            currentPrefix={currentPrefix}
            onUpload={handleUpload}
            onClose={() => setShowUploadDialog(false)}
          />
        )}
        
        {showNewFolderDialog && (
          <NewFolderDialog
            currentPrefix={currentPrefix}
            onCreateFolder={handleCreateFolder}
            onClose={() => setShowNewFolderDialog(false)}
          />
        )}
        
        {selectedFile && signedUrl && !showImageCarousel && (
          <FilePreview
            file={selectedFile}
            signedUrl={signedUrl}
            onClose={() => {
              setSelectedFile(null);
              setSignedUrl("");
            }}
            onDelete={handleDelete}
          />
        )}
        
        {showImageCarousel && imageFiles.length > 0 && (
          <ImageCarousel
            images={imageFiles.map(file => ({
              file,
              url: imageUrls[file.key] || ""
            })).filter(img => img.url)}
            initialIndex={carouselIndex}
            onClose={() => {
              setShowImageCarousel(false);
              setSelectedFile(null);
              setSignedUrl("");
            }}
          />
        )}
      </div>
    </LayoutWithSidebar>
  );
}
