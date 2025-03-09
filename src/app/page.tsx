"use client";

import React, { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { FileExplorer } from "@/components/file-explorer";
import { UploadDialog } from "@/components/upload-dialog";
import { FilePreview } from "@/components/file-preview";
import { R2Object } from "@/lib/r2-types";
import { ThemeToggle } from "@/components/theme-toggle";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { Loading } from "@/components/loading";

export default function Home() {
  const { isConfigValid, isLoading: isConfigLoading } = useConfig();
  
  const [files, setFiles] = useState<R2Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<R2Object | null>(null);
  const [signedUrl, setSignedUrl] = useState("");

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
      const response = await fetch(`/api/r2?action=getSignedUrl&key=${encodeURIComponent(file.key)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSignedUrl(data.url);
      } else {
        console.error("Error getting signed URL:", data.error);
        toast.error("Failed to generate download link");
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
      const key = currentPrefix + folderName;
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

  if (isConfigLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loading text="正在加载配置..." />
      </main>
    );
  }

  if (!isConfigValid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
          <h1 className="text-2xl font-bold mb-4">配置不完整</h1>
          <p className="mb-4">
            R2 配置不完整。请在设置页面完成配置：
          </p>
          <div className="flex justify-center mt-4">
            <Button asChild>
              <Link href="/settings">转到设置</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <Toaster position="top-right" />
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cloudflare R2 Client</h1>
          <p className="text-muted-foreground">
            Browse, upload, and manage your files in Cloudflare R2 storage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href="/settings">设置</Link>
          </Button>
        </div>
      </div>
      
      <div className="mb-4 flex gap-2">
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
      
      <FileExplorer
        files={files}
        currentPrefix={currentPrefix}
        isLoading={isLoading}
        onFileClick={handleFileClick}
        onUploadClick={() => setShowUploadDialog(true)}
        onDeleteClick={handleBatchDelete}
        onNavigate={handleNavigate}
        onRefresh={loadFiles}
      />
      
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
      
      {selectedFile && signedUrl && (
        <FilePreview
          file={selectedFile}
          signedUrl={signedUrl}
          onClose={() => setSelectedFile(null)}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
