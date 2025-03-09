"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  src: string;
  alt: string;
  onClose?: () => void;
}

export function ImagePreview({ src, alt, onClose }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 切换全屏模式
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 缩放控制
  const handleZoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.25, 0.5)), []);
  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 拖拽控制
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 确保鼠标移出时结束拖拽
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // 支持键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (onClose) {
            onClose();
            e.stopPropagation(); // 防止事件冒泡
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleZoomIn, handleZoomOut, handleResetZoom, toggleFullscreen]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 关闭按钮 */}
      {onClose && (
        <Button
          className="absolute top-2 right-2 z-30 bg-black/40 text-white hover:bg-black/60"
          size="sm"
          variant="outline"
          onClick={onClose}
          title="关闭预览 (ESC)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      )}
      
      {/* 添加透明背景层，点击可关闭 */}
      {onClose && (
        <div 
          className="absolute inset-0 z-10" 
          onClick={(e) => {
            // 只有直接点击背景才关闭，避免点击图片或控制按钮时关闭
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          aria-label="点击关闭"
        />
      )}
      
      {/* 图片容器 */}
      <div 
        className={`relative ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[65vh] object-contain transition-transform duration-200"
          style={{ 
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center'
          }}
          draggable={false}
        />
      </div>

      {/* 控制按钮 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/40 p-2 rounded-lg backdrop-blur-sm">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleZoomOut}
          title="缩小 (-)"
          className="text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleResetZoom}
          title="重置缩放 (0)"
          className="text-white"
        >
          {Math.round(scale * 100)}%
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleZoomIn}
          title="放大 (+)"
          className="text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleFullscreen}
          title="全屏 (F)"
          className="text-white"
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
} 