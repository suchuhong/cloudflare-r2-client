"use client";

import React from "react";

interface LoadingProps {
  text?: string;
}

export function Loading({ text = "加载中..." }: LoadingProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
} 