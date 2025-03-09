"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { Loading } from "@/components/loading";

interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<R2Config>({
    endpoint: "",
    region: "auto",
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setConfig(data.config);
        }
      } catch (error) {
        console.error("Error loading config:", error);
        toast.error("加载配置失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedConfig();
  }, []);

  // 保存配置
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });
      
      if (response.ok) {
        toast.success("配置已保存");
      } else {
        const data = await response.json();
        toast.error(`保存失败: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("保存配置时出错");
    } finally {
      setIsSaving(false);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("连接成功！已成功验证 R2 配置");
      } else {
        const errorMsg = data.error || "连接失败，请检查配置";
        toast.error(errorMsg, {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("测试连接时出错，请检查网络连接", {
        duration: 5000,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <Toaster position="top-right" />
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">设置</h1>
          <p className="text-muted-foreground">
            配置 Cloudflare R2 连接参数
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href="/">返回主页</Link>
          </Button>
        </div>
      </div>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>R2 配置</CardTitle>
        </CardHeader>
        
        {isLoading ? (
          <CardContent>
            <Loading text="加载配置中..." />
          </CardContent>
        ) : (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="endpoint" className="text-sm font-medium">
                  端点 URL
                </label>
                <Input
                  id="endpoint"
                  placeholder="https://xxxxx.r2.cloudflarestorage.com"
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Cloudflare R2 的端点 URL，格式通常为 https://accountid.r2.cloudflarestorage.com
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="region" className="text-sm font-medium">
                  区域
                </label>
                <Input
                  id="region"
                  placeholder="auto"
                  value={config.region}
                  onChange={(e) => setConfig({ ...config, region: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  R2 区域，通常为 "auto"
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="accessKeyId" className="text-sm font-medium">
                  访问密钥 ID
                </label>
                <Input
                  id="accessKeyId"
                  placeholder="Access Key ID"
                  value={config.accessKeyId}
                  onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  在 Cloudflare 控制台 R2 部分创建的 API 密钥的 ID
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="secretAccessKey" className="text-sm font-medium">
                  秘密访问密钥
                </label>
                <Input
                  id="secretAccessKey"
                  placeholder="Secret Access Key"
                  type="password"
                  value={config.secretAccessKey}
                  onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  在 Cloudflare 控制台 R2 部分创建的 API 密钥的密钥
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="bucketName" className="text-sm font-medium">
                  存储桶名称
                </label>
                <Input
                  id="bucketName"
                  placeholder="my-bucket"
                  value={config.bucketName}
                  onChange={(e) => setConfig({ ...config, bucketName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  要连接的 R2 存储桶名称
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handleTestConnection} 
                disabled={isTesting}
              >
                {isTesting ? "测试中..." : "测试连接"}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "保存配置"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </main>
  );
} 