"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface NewFolderDialogProps {
  currentPrefix: string;
  onCreateFolder: (folderName: string) => Promise<void>;
  onClose: () => void;
}

export function NewFolderDialog({ currentPrefix, onCreateFolder, onClose }: NewFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateFolder = async () => {
    // 验证文件夹名称
    if (!folderName || folderName.trim() === "") {
      setError("文件夹名称不能为空");
      return;
    }

    if (folderName.includes("/")) {
      setError("文件夹名称不能包含斜杠 (/)");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      await onCreateFolder(folderName.trim());
      onClose();
    } catch (error) {
      console.error("创建文件夹失败:", error);
      setError("创建文件夹失败，请重试");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>新建文件夹</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm mb-2">当前目录: {currentPrefix || "根目录"}</p>
            <div className="space-y-2">
              <label htmlFor="folderName" className="text-sm font-medium">
                文件夹名称
              </label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="输入文件夹名称"
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleCreateFolder}
            disabled={isCreating}
          >
            {isCreating ? "创建中..." : "创建"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 