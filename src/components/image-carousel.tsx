"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImagePreview } from "./image-preview";
import { R2Object } from "@/lib/r2-types";

interface ImageCarouselProps {
  images: { file: R2Object; url: string }[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageCarousel({ images, initialIndex, onClose }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentImage = images[currentIndex];

  // 使用useCallback定义前进和后退函数
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          e.stopPropagation(); // 防止事件冒泡
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, goToPrevious, goToNext]); // 添加正确的依赖项

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
      {/* 添加一个全屏遮罩层，点击任意位置关闭 */}
      <div 
        className="absolute inset-0 z-0" 
        onClick={onClose}
        aria-label="关闭预览"
      />
      
      {/* 顶部标题栏 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="text-white font-medium">
          {currentImage.file.key.split("/").pop()} ({currentIndex + 1}/{images.length})
        </div>
        <Button 
          variant="ghost" 
          className="text-white hover:bg-white/20 p-2 h-auto w-auto" 
          onClick={onClose}
          title="关闭 (ESC)"
          size="lg"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      </div>
      
      {/* 添加一个更明显的关闭按钮在右上角 */}
      <Button
        variant="outline"
        className="absolute top-4 right-4 z-20 bg-black/40 text-white border-white/30 hover:bg-black/60 hover:border-white"
        onClick={onClose}
        size="sm"
      >
        关闭
      </Button>
      
      {/* 主图片区域 */}
      <div className="flex-1 w-full flex items-center justify-center">
        <ImagePreview src={currentImage.url} alt={currentImage.file.key} />
      </div>
      
      {/* 翻页按钮 */}
      {images.length > 1 && (
        <>
          <Button 
            variant="ghost" 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/30 p-2"
            onClick={goToPrevious}
            title="上一张 (←)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Button>
          
          <Button 
            variant="ghost" 
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/30 p-2"
            onClick={goToNext}
            title="下一张 (→)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Button>
        </>
      )}
      
      {/* 缩略图条 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/40 rounded-lg overflow-x-auto max-w-[80%]">
          {images.map((image, index) => (
            <div 
              key={image.file.key} 
              className={`w-16 h-16 shrink-0 rounded overflow-hidden cursor-pointer border-2 transition-all ${index === currentIndex ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
              onClick={() => setCurrentIndex(index)}
            >
              <img 
                src={image.url} 
                alt={`缩略图 ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 