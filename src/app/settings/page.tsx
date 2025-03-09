"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Loading } from "@/components/loading";
import { LayoutWithSidebar } from "@/components/layout-with-sidebar";
import { useConfig } from "@/contexts/config-context";

interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface TestResult {
  success: boolean;
  message: string;
  connectionDetails?: {
    endpoint: string;
    region: string;
    bucketName: string;
  };
}

export default function SettingsPage() {
  const { config, isLoading, saveConfig } = useConfig();
  const [formValues, setFormValues] = useState<R2Config>({
    endpoint: "",
    region: "auto",
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // 检测是否为开发环境
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 加载已保存的配置
  useEffect(() => {
    if (config) {
      setFormValues({
        endpoint: config.endpoint || "",
        region: config.region || "auto",
        accessKeyId: config.accessKeyId || "",
        secretAccessKey: config.secretAccessKey || "",
        bucketName: config.bucketName || ""
      });
    }
  }, [config]);

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // 使用 Context 提供的 saveConfig 方法
      const success = await saveConfig(formValues);
      
      if (success) {
        toast.success("配置已保存");
      }
    } catch (error) {
      console.error("保存配置失败:", error);
      toast.error("保存配置失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      
      // 使用当前表单值进行测试
      const response = await fetch('/api/r2/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formValues)
      });
      
      const result = await response.json();
      
      setTestResult({
        success: result.success,
        message: result.message,
        connectionDetails: result.success ? {
          endpoint: formValues.endpoint,
          region: formValues.region,
          bucketName: formValues.bucketName
        } : undefined
      });
      
      if (result.success) {
        toast.success("连接测试成功");
      } else {
        toast.error(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error("测试连接失败:", error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "未知错误"
      });
      toast.error("测试连接失败");
    } finally {
      setIsTesting(false);
    }
  };

  // 切换显示 Access Key
  const handleShowAccessKey = () => {
    setShowAccessKey(prev => !prev);
  };

  // 切换显示 Secret Key
  const handleShowSecretKey = () => {
    setShowSecretKey(prev => !prev);
  };

  if (isLoading) {
    return (
      <LayoutWithSidebar>
        <div className="container mx-auto p-4">
          <Loading text="加载配置中..." />
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="container mx-auto p-4 max-w-3xl">
        <Toaster position="top-right" />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Cloudflare R2 配置</h1>
          <p className="text-muted-foreground">
            设置您的 Cloudflare R2 凭证以连接存储桶
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>R2 连接设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="endpoint" className="text-sm font-medium">
                  端点 URL
                </label>
                <Input
                  id="endpoint"
                  name="endpoint"
                  placeholder="https://xxxxxxxxxxxx.r2.cloudflarestorage.com"
                  value={formValues.endpoint}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Cloudflare R2 存储桶的端点 URL，通常格式为 https://accountid.r2.cloudflarestorage.com
                </p>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="region" className="text-sm font-medium">
                  区域
                </label>
                <Input
                  id="region"
                  name="region"
                  placeholder="auto"
                  value={formValues.region}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  R2 存储桶的区域，通常为 &quot;auto&quot;
                </p>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="accessKeyId" className="text-sm font-medium">
                  访问密钥 ID
                </label>
                <div className="flex">
                  <Input
                    id="accessKeyId"
                    name="accessKeyId"
                    type={showAccessKey ? "text" : "password"}
                    placeholder="您的 R2 访问密钥 ID"
                    value={formValues.accessKeyId}
                    onChange={handleChange}
                    className="flex-grow"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={handleShowAccessKey}
                  >
                    {showAccessKey ? "隐藏" : "显示"}
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="secretAccessKey" className="text-sm font-medium">
                  秘密访问密钥
                </label>
                <div className="flex">
                  <Input
                    id="secretAccessKey"
                    name="secretAccessKey"
                    type={showSecretKey ? "text" : "password"}
                    placeholder="您的 R2 秘密访问密钥"
                    value={formValues.secretAccessKey}
                    onChange={handleChange}
                    className="flex-grow"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={handleShowSecretKey}
                  >
                    {showSecretKey ? "隐藏" : "显示"}
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="bucketName" className="text-sm font-medium">
                  存储桶名称
                </label>
                <Input
                  id="bucketName"
                  name="bucketName"
                  placeholder="your-bucket-name"
                  value={formValues.bucketName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
            >
              {isTesting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2"></div>
                  测试中...
                </>
              ) : (
                "测试连接"
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isTesting || isSaving}
            >
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2"></div>
                  保存中...
                </>
              ) : (
                "保存配置"
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {testResult && (
          <Card className={`mb-6 ${testResult.success ? "border-green-500" : "border-destructive"}`}>
            <CardHeader>
              <CardTitle>
                {testResult.success ? "连接成功! ✅" : "连接失败 ❌"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">{testResult.message}</p>
              {testResult.success && testResult.connectionDetails && (
                <div className="space-y-1 text-sm">
                  <p><strong>端点:</strong> {testResult.connectionDetails.endpoint}</p>
                  <p><strong>区域:</strong> {testResult.connectionDetails.region}</p>
                  <p><strong>存储桶:</strong> {testResult.connectionDetails.bucketName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <div className="mt-8 text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>提示：</strong> 您的凭证安全地存储在浏览器的 localStorage 中，并且不会发送到任何第三方服务器。
          </p>
          <p>
            <strong>如何获取 R2 凭证?</strong> 登录 Cloudflare 控制台，导航到 R2，然后创建 API 令牌获取访问密钥。
          </p>
        </div>
        
        {/* 调试区域 - 仅在开发环境显示 */}
        {isDevelopment && (
          <div className="mt-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              {showDebugInfo ? "隐藏调试信息" : "显示调试信息"}
            </Button>
            
            {showDebugInfo && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>开发调试信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono">
                    <p><strong>当前环境:</strong> {process.env.NODE_ENV}</p>
                    <p><strong>配置状态:</strong> {config ? "已加载" : "未加载"}</p>
                    <p><strong>LocalStorage 状态:</strong> {typeof window !== 'undefined' && localStorage.getItem('r2-config') ? "存在" : "不存在"}</p>
                    <div>
                      <p><strong>表单值 (部分隐藏):</strong></p>
                      <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify({
                          ...formValues,
                          accessKeyId: formValues.accessKeyId ? "***" : "",
                          secretAccessKey: formValues.secretAccessKey ? "***" : ""
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  );
} 