"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { R2Object } from "@/lib/r2-types";
import { formatFileSize, getFileExtension } from "@/lib/utils";
import { FileIcon } from "@/components/file-icon";

interface FilePreviewProps {
  file: R2Object;
  signedUrl: string;
  onClose: () => void;
  onDelete: (file: R2Object) => void;
}

export function FilePreview({ file, signedUrl, onClose, onDelete }: FilePreviewProps) {
  const fileName = file.key.split("/").pop() || file.key;
  const extension = getFileExtension(fileName);
  
  const lastModified = file.lastModified instanceof Date 
    ? file.lastModified 
    : new Date(file.lastModified);
  
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);
  const isPdf = extension === "pdf";
  const isVideo = ["mp4", "webm", "ogg"].includes(extension);
  const isAudio = ["mp3", "wav", "ogg"].includes(extension);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 truncate">
              <FileIcon filename={file.key} />
              <span className="truncate">{fileName}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
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
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Size: {formatFileSize(file.size)} | Last Modified: {lastModified.toLocaleString()}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="w-full h-full flex items-center justify-center">
            {isImage && (
              <img
                src={signedUrl}
                alt={fileName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
            {isPdf && (
              <iframe
                src={signedUrl}
                className="w-full h-[60vh]"
                title={fileName}
              />
            )}
            {isVideo && (
              <video
                src={signedUrl}
                controls
                className="max-w-full max-h-[60vh]"
              />
            )}
            {isAudio && (
              <audio src={signedUrl} controls className="w-full" />
            )}
            {!isImage && !isPdf && !isVideo && !isAudio && (
              <div className="text-center p-8">
                <FileIcon filename={file.key} className="mx-auto w-16 h-16 mb-4" />
                <p>This file type cannot be previewed</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to delete this file?")) {
                onDelete(file);
              }
            }}
            className="text-white font-medium hover:bg-red-600 destructive-button"
          >
            Delete
          </Button>
          <Button asChild>
            <a href={signedUrl} download={fileName} target="_blank" rel="noopener noreferrer">
              Download
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 