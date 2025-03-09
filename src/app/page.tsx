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
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // 加载文件列表
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      console.log(`Loading files from prefix: "${currentPrefix}"`);
      const response = await fetch(`/api/r2?action=listObjects&prefix=${encodeURIComponent(currentPrefix)}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log("API response:", data);
        
        // 将接收到的日期字符串转换回 Date 对象
        const filesWithDates = (data.objects || []).map(file => ({
          ...file,
          lastModified: new Date(file.lastModified)
        }));
        
        setFiles(filesWithDates);
        console.log("Processed files:", filesWithDates);
        
        // 过滤出图片文件
        const imgExts = ["jpg", "jpeg", "png", "gif", "webp"];
        const imgFiles = filesWithDates.filter(file => {
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
        toast.success("文件上传成功");
        loadFiles();
      } else {
        console.error("Error uploading file:", data);
        
        // 处理权限错误
        if (response.status === 403 || data.errorCode === 'ACCESS_DENIED') {
          toast.error(data.error || "权限错误：没有上传权限", {
            description: data.detail || "您的 R2 令牌不具备写入权限，请联系管理员更新令牌权限或使用只读模式浏览文件。",
            duration: 6000,
            icon: "🔒"
          });
          
          // 设置UI状态为只读模式
          setIsReadOnlyMode(true);
        } else {
          toast.error(data.error || "上传失败", {
            description: data.detail,
          });
        }
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("上传失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
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
        toast.success("文件删除成功");
        setSelectedFile(null);
        loadFiles();
      } else {
        console.error("Error deleting file:", data);
        
        // 处理权限错误
        if (response.status === 403 || data.errorCode === 'ACCESS_DENIED') {
          toast.error(data.error || "权限错误：没有删除权限", {
            description: data.detail || "您的 R2 令牌不具备写入权限，请联系管理员更新令牌权限或使用只读模式浏览文件。",
            duration: 6000,
            icon: "🔒"
          });
          
          // 设置UI状态为只读模式
          setIsReadOnlyMode(true);
        } else {
          toast.error(data.error || "删除失败", {
            description: data.detail,
          });
        }
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("删除失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    }
  };

  // 处理批量删除
  const handleBatchDelete = async (files: R2Object[]) => {
    if (files.length === 0) return;
    
    if (!confirm(`确定要删除选中的 ${files.length} 个文件吗？`)) {
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
        toast.success(`成功删除 ${files.length} 个文件`);
        loadFiles();
      } else {
        console.error("Error deleting files:", data);
        
        // 处理权限错误
        if (response.status === 403 || data.errorCode === 'ACCESS_DENIED') {
          toast.error(data.error || "权限错误：没有删除权限", {
            description: data.detail || "您的 R2 令牌不具备写入权限，请联系管理员更新令牌权限或使用只读模式浏览文件。",
            duration: 6000,
            icon: "🔒"
          });
          
          // 设置UI状态为只读模式
          setIsReadOnlyMode(true);
        } else {
          toast.error(data.error || "批量删除失败", {
            description: data.detail,
          });
        }
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("批量删除失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
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
        console.error("Error creating folder:", data);
        
        // 处理权限错误
        if (response.status === 403 || data.errorCode === 'ACCESS_DENIED') {
          toast.error(data.error || "权限错误：没有创建文件夹权限", {
            description: data.detail || "您的 R2 令牌不具备写入权限，请联系管理员更新令牌权限或使用只读模式浏览文件。",
            duration: 6000,
            icon: "🔒"
          });
          
          // 设置UI状态为只读模式
          setIsReadOnlyMode(true);
        } else {
          toast.error(data.error || "创建文件夹失败", {
            description: data.detail,
          });
        }
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("创建文件夹失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    }
  };

  // 加载所有图片的预签名 URL
  const loadImageUrls = async () => {
    if (imageFiles.length === 0) return;
    
    console.log("Loading image URLs for", imageFiles.length, "images");
    const newUrls: { [key: string]: string } = {};
    let hasError = false;
    
    for (const file of imageFiles) {
      if (imageUrls[file.key]) {
        console.log(`Skipping ${file.key}, URL already cached`);
        continue; // 跳过已有 URL 的图片
      }
      
      try {
        console.log(`Fetching signed URL for ${file.key}`);
        const response = await fetch(`/api/r2?action=getSignedUrl&key=${encodeURIComponent(file.key)}`);
        const data = await response.json();
        
        if (response.ok) {
          if (data.signedUrl) {
            console.log(`Got signed URL for ${file.key}`);
            newUrls[file.key] = data.signedUrl;
          } else {
            console.error(`Missing signedUrl in response for ${file.key}:`, data);
            hasError = true;
          }
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
      console.log(`Adding ${Object.keys(newUrls).length} new image URLs`);
      setImageUrls(prev => ({ ...prev, ...newUrls }));
    } else if (hasError) {
      toast.error("Failed to load some image previews");
    }
  };
  
  // 当图片文件列表变化时，加载预签名 URL
  useEffect(() => {
    const imageFilesArray = Array.isArray(imageFiles) ? imageFiles : [];
    if (imageFilesArray.length > 0) {
      loadImageUrls();
    }
  }, [imageFiles]);

  // 运行诊断
  const runDiagnostics = async () => {
    try {
      const diagResponse = await fetch('/api/r2/diagnose');
      const diagData = await diagResponse.json();
      console.log("=== R2 DIAGNOSTICS ===");
      console.log(diagData);
      
      // 在页面上显示一些重要信息
      if (diagData.connectionTest?.success) {
        toast.success("R2 连接成功！发现 " + (diagData.connectionTest.objects?.length || 0) + " 个对象");
      } else {
        toast.error("R2 连接失败: " + diagData.connectionTest?.message);
      }
    } catch (error) {
      console.error("诊断错误:", error);
      toast.error("运行诊断时出错");
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
              {isReadOnlyMode && (
                <div className="ml-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-md text-xs font-medium flex items-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M8 11V9l8 8" />
                  </svg>
                  只读模式
                </div>
              )}
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
              disabled={isReadOnlyMode}
              title={isReadOnlyMode ? "只读模式下不可用" : "创建新文件夹"}
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
              disabled={isReadOnlyMode}
              title={isReadOnlyMode ? "只读模式下不可用" : "上传文件"}
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
            isReadOnly={isReadOnlyMode}
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
