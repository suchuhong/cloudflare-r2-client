"use client";

import React, { useState, useEffect } from "react";
import { R2Object } from "@/lib/r2-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "@/lib/utils";
import { FileIcon } from "@/components/file-icon";

interface FileExplorerProps {
  files: R2Object[];
  currentPrefix: string;
  isLoading: boolean;
  imageUrls?: { [key: string]: string };
  onFileClick: (file: R2Object) => void;
  onUploadClick: () => void;
  onDeleteClick: (files: R2Object[]) => void;
  onNavigate: (prefix: string) => void;
  onRefresh: () => void;
}

// 日期格式化辅助函数
const formatDate = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString();
};

export function FileExplorer({
  files,
  currentPrefix,
  isLoading,
  imageUrls = {},
  onFileClick,
  onUploadClick,
  onDeleteClick,
  onNavigate,
  onRefresh,
}: FileExplorerProps) {
  const [selectedFiles, setSelectedFiles] = useState<R2Object[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverImageKey, setHoverImageKey] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const filteredFiles = searchQuery
    ? files.filter((file) =>
        file.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  const handleFileSelect = (file: R2Object, isSelected: boolean) => {
    if (isSelected) {
      setSelectedFiles((prev) => [...prev, file]);
    } else {
      setSelectedFiles((prev) => prev.filter((f) => f.key !== file.key));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedFiles(files);
    } else {
      setSelectedFiles([]);
    }
  };

  const getParentPrefix = () => {
    if (!currentPrefix || currentPrefix === "") return "";
    const parts = currentPrefix.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    
    parts.pop(); // 移除最后一个部分
    if (parts.length === 0) return "";
    
    return parts.join("/") + "/";
  };

  const breadcrumbs = () => {
    if (!currentPrefix) return [{ name: "Root", prefix: "" }];

    // 确保处理干净的路径，移除开头和结尾的斜杠
    const cleanPrefix = currentPrefix.replace(/^\/+|\/+$/g, "");
    
    // 如果前缀为空（清理后），只返回根目录
    if (!cleanPrefix) return [{ name: "Root", prefix: "" }];
    
    const parts = cleanPrefix.split("/").filter(Boolean);
    const breadcrumbs = [{ name: "Root", prefix: "" }];

    let cumulativePath = "";
    for (const part of parts) {
      cumulativePath += `${part}/`;
      breadcrumbs.push({
        name: part,
        prefix: cumulativePath,
      });
    }

    return breadcrumbs;
  };

  // 当鼠标移动时更新位置
  const handleMouseMove = (e: MouseEvent) => {
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };

  // 鼠标进入图片时设置悬停图片的键值
  const handleMouseEnter = (fileKey: string) => {
    setHoverImageKey(fileKey);
  };

  // 鼠标离开图片时清除悬停图片的键值
  const handleMouseLeave = () => {
    setHoverImageKey(null);
  };

  // 监听全局鼠标移动
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // 当导航更改时重置选择
  useEffect(() => {
    setSelectedFiles([]);
  }, [currentPrefix]);

  // 检查文件是否是图片
  const isImageFile = (filename: string): boolean => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>File Explorer</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onUploadClick}
            >
              Upload
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDeleteClick(selectedFiles)}
              disabled={selectedFiles.length === 0}
              className="text-white font-medium hover:bg-red-600 destructive-button"
            >
              Delete Selected
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs().map((crumb, i) => (
              <React.Fragment key={crumb.prefix}>
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => onNavigate(crumb.prefix)}
                  className="hover:underline text-blue-500"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p>Loading...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-muted-foreground">
            <p>No files found</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-2 bg-muted/50 border-b">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={
                    selectedFiles.length > 0 &&
                    selectedFiles.length === files.length
                  }
                  className="mr-2"
                />
              </div>
              <div className="font-medium">Name</div>
              <div className="font-medium">Size</div>
              <div className="font-medium">Last Modified</div>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              {currentPrefix && (
                <div
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-2 hover:bg-muted/50 cursor-pointer border-b"
                  onClick={() => onNavigate(getParentPrefix())}
                >
                  <div></div>
                  <div className="flex items-center gap-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span>Go up</span>
                  </div>
                  <div></div>
                  <div></div>
                </div>
              )}
              {filteredFiles.map((file) => {
                const fileName = file.key.split("/").pop() || file.key;
                // 优先使用 API 返回的 isFolder 标志，如果没有则根据文件名判断
                const isFolder = file.isFolder || fileName.endsWith("/");
                const displayName = isFolder && fileName.endsWith("/") ? fileName.slice(0, -1) : fileName;
                const isImage = !isFolder && isImageFile(fileName);
                const hasPreview = isImage && imageUrls[file.key];

                return (
                  <div
                    key={file.key}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-2 hover:bg-muted/50 cursor-pointer border-b"
                    onClick={() => {
                      if (isFolder) {
                        const folderPath = file.key.endsWith('/') ? file.key : `${file.key}/`;
                        onNavigate(folderPath);
                      } else {
                        onFileClick(file);
                      }
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.some(
                          (f) => f.key === file.key
                        )}
                        onChange={(e) => {
                          handleFileSelect(file, e.target.checked);
                        }}
                        className="mr-2"
                      />
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      {hasPreview ? (
                        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={imageUrls[file.key]} 
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onMouseEnter={() => handleMouseEnter(file.key)}
                            onMouseLeave={handleMouseLeave}
                          />
                        </div>
                      ) : (
                        <FileIcon filename={file.key} />
                      )}
                      <span className="truncate">{displayName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {isFolder ? "--" : formatFileSize(file.size)}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(file.lastModified)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* 图片悬停预览 */}
      {hoverImageKey && imageUrls[hoverImageKey] && (
        <div 
          className="fixed z-50 rounded-md overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{
            left: `${hoverPosition.x + 20}px`,
            top: `${hoverPosition.y - 100}px`,
            pointerEvents: 'none',
          }}
        >
          <div className="relative">
            <img 
              src={imageUrls[hoverImageKey]} 
              alt="预览" 
              className="max-w-[300px] max-h-[300px] object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
              {hoverImageKey.split('/').pop()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 