"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  const { isConfigValid, isLoading: isConfigLoading } = useConfig();
  
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

  // 加载文件列表
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/r2?action=listObjects&prefix=${encodeURIComponent(currentPrefix)}`);
      const data = await response.json();
      
      if (response.ok) {
        // 将接收到的日期字符串转换回 Date 对象
        const filesWithDates = (data.objects || []).map(file => ({
          ...file,
          lastModified: new Date(file.lastModified)
        }));
        
        setFiles(filesWithDates);
        
        // 过滤出图片文件
        const imgExts = ["jpg", "jpeg", "png", "gif", "webp"];
        const imgFiles = filesWithDates.filter(file => {
          if (file.isFolder) return false;
          const ext = file.key.split(".").pop()?.toLowerCase() || "";
          return imgExts.includes(ext);
        });
        
        setImageFiles(imgFiles);
      } else {
        console.error("Error loading files:", data.error);
        toast.error("Failed to load files");
      }
    } catch (error) {
      console.error("Error loading files:", error);
      toast.error("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  // 监听前缀变化重新加载文件
  useEffect(() => {
    if (isConfigValid) {
      loadFiles();
    }
  }, [currentPrefix, isConfigValid]);

  // 处理文件点击
  const handleFileClick = async (file: R2Object) => {
    try {
      setSelectedFile(file);
      
      // 检查是否是图片
      const fileName = file.key.split("/").pop() || "";
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
      
      if (isImage) {
        // 如果是图片，检查是否已有 URL
        if (!imageUrls[file.key]) {
          const response = await fetch(`/api/r2?action=getSignedUrl&key=${encodeURIComponent(file.key)}`);
          const data = await response.json();
          
          if (response.ok) {
            setImageUrls(prev => ({ ...prev, [file.key]: data.url }));
            setSignedUrl(data.url);
          } else {
            console.error("Error getting signed URL:", data.error);
            toast.error("Failed to generate download link");
            return;
          }
        } else {
          setSignedUrl(imageUrls[file.key]);
        }
        
        // 找到当前图片在图片文件数组中的索引
        const index = imageFiles.findIndex(img => img.key === file.key);
        if (index !== -1) {
          setCarouselIndex(index);
          setShowImageCarousel(true);
        }
      } else {
        // 如果不是图片，获取常规链接
        const response = await fetch(`/api/r2?action=getSignedUrl&key=${encodeURIComponent(file.key)}`);
        const data = await response.json();
        
        if (response.ok) {
          setSignedUrl(data.url);
        } else {
          console.error("Error getting signed URL:", data.error);
          toast.error("Failed to generate download link");
        }
      }
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast.error("Failed to generate download link");
    }
  };

  // 处理文件上传
  const handleUpload = async (file: File, key: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/r2?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`, {
        method: 'PUT',
        body: file
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("File uploaded successfully");
        loadFiles();
      } else {
        console.error("Error uploading file:", data.error);
        toast.error("Failed to upload file");
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
      throw error;
    }
  };

  // 处理文件删除
  const handleDelete = async (file: R2Object) => {
    try {
      const response = await fetch('/api/r2?action=deleteObject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: file.key }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("File deleted successfully");
        setSelectedFile(null);
        loadFiles();
      } else {
        console.error("Error deleting file:", data.error);
        toast.error("Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  // 处理批量删除
  const handleBatchDelete = async (files: R2Object[]) => {
    if (files.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${files.length} file(s)?`)) {
      return;
    }

    try {
      const response = await fetch('/api/r2?action=deleteObjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys: files.map(file => file.key) }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`${files.length} file(s) deleted successfully`);
        loadFiles();
      } else {
        console.error("Error deleting files:", data.error);
        toast.error("Failed to delete files");
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
    }
  };

  // 处理导航
  const handleNavigate = (prefix: string) => {
    setCurrentPrefix(prefix);
  };

  // 处理创建文件夹
  const handleCreateFolder = async (folderName: string) => {
    try {
      // 确保 currentPrefix 末尾有斜杠，若已存在则不添加
      const prefix = currentPrefix ? (currentPrefix.endsWith('/') ? currentPrefix : `${currentPrefix}/`) : '';
      const key = prefix + folderName;
      const response = await fetch('/api/r2?action=createFolder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("文件夹创建成功");
        loadFiles();
      } else {
        console.error("Error creating folder:", data.error);
        toast.error("创建文件夹失败");
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("创建文件夹失败");
      throw error;
    }
  };

  // 加载所有图片的预签名 URL
  const loadImageUrls = async () => {
    if (imageFiles.length === 0) return;
    
    const newUrls: { [key: string]: string } = {};
    let hasError = false;
    
    for (const file of imageFiles) {
      if (imageUrls[file.key]) continue; // 跳过已有 URL 的图片
      
      try {
        const response = await fetch(`/api/r2?action=getSignedUrl&key=${encodeURIComponent(file.key)}`);
        const data = await response.json();
        
        if (response.ok) {
          newUrls[file.key] = data.url;
        } else {
          console.error(`Error getting signed URL for ${file.key}:`, data.error);
          hasError = true;
        }
      } catch (error) {
        console.error(`Error getting signed URL for ${file.key}:`, error);
        hasError = true;
      }
    }
    
    if (Object.keys(newUrls).length > 0) {
      setImageUrls(prev => ({ ...prev, ...newUrls }));
    }
    
    if (hasError) {
      toast.error("部分图片预览链接获取失败");
    }
  };
  
  // 当图片文件列表变化时，加载预签名 URL
  useEffect(() => {
    if (imageFiles.length > 0) {
      loadImageUrls();
    }
  }, [imageFiles]);

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
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold">文件浏览器</h1>
          <p className="text-muted-foreground">
            浏览、上传和管理 Cloudflare R2 存储中的文件
          </p>
        </div>
        
        <div className="mb-4 flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolderDialog(true)}
            >
              <svg
                className="mr-2"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                <line x1="12" y1="10" x2="12" y2="16" />
                <line x1="9" y1="13" x2="15" y2="13" />
              </svg>
              新建文件夹
            </Button>
          </div>
          
          {/* 视图切换按钮，只在有图片时显示 */}
          {imageFiles.length > 0 && (
            <div className="flex gap-2">
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
            </div>
          )}
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
            onNavigate={handleNavigate}
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
