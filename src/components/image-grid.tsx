"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { R2Object } from "@/lib/r2-types";
import { formatFileSize } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImageGridProps {
  files: R2Object[];
  imageUrls: { [key: string]: string };
  onImageClick: (file: R2Object) => void;
  onViewListMode: () => void;
}

export function ImageGrid({ files, imageUrls, onImageClick, onViewListMode }: ImageGridProps) {
  // 只显示有预览URL的图片
  const imagesWithPreview = files.filter(file => imageUrls[file.key]);
  
  // 悬停预览状态
  const [hoverImageKey, setHoverImageKey] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  
  // 当鼠标移动时更新位置
  const handleMouseMove = (e: MouseEvent) => {
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };
  
  // 监听全局鼠标移动
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle>图片集</CardTitle>
        <Button variant="outline" size="sm" onClick={onViewListMode}>
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
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          列表视图
        </Button>
      </CardHeader>
      <CardContent>
        {imagesWithPreview.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-muted-foreground">
            <p>没有可预览的图片</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {imagesWithPreview.map((file) => {
              const fileName = file.key.split("/").pop() || file.key;
              return (
                <div 
                  key={file.key}
                  className="group relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:opacity-95 transition-all hover:shadow-md"
                  onClick={() => onImageClick(file)}
                  onMouseEnter={() => setHoverImageKey(file.key)}
                  onMouseLeave={() => setHoverImageKey(null)}
                >
                  <img 
                    src={imageUrls[file.key]} 
                    alt={fileName}
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-white text-sm truncate">{fileName}</p>
                    <p className="text-white/80 text-xs">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* 图片悬停预览 */}
        {hoverImageKey && imageUrls[hoverImageKey] && (
          <div 
            className="fixed z-50 rounded-md overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            style={{
              left: `${hoverPosition.x + 20}px`,
              top: `${hoverPosition.y - 150}px`,
              pointerEvents: 'none',
              maxWidth: '400px',
              maxHeight: '400px',
            }}
          >
            <div className="relative">
              <img 
                src={imageUrls[hoverImageKey]} 
                alt="预览" 
                className="max-w-[400px] max-h-[400px] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                <p className="truncate">{hoverImageKey.split('/').pop()}</p>
                <p className="text-xs text-gray-300">
                  {formatFileSize(files.find(f => f.key === hoverImageKey)?.size || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 