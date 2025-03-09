"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Loading } from "@/components/loading";
import { LayoutWithSidebar } from "@/components/layout-with-sidebar";

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
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        setIsLoading(true);
        
        // 获取配置文件状态信息
        const statusResponse = await fetch('/api/settings/status');
        const statusData = await statusResponse.json();
        console.log('Config file status:', statusData);
        setConfigStatus(statusData);
        
        // 获取掩码后的配置
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          
          // 默认设置密钥为隐藏状态
          setShowAccessKey(false);
          setShowSecretKey(false);
          
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
    
    // 页面卸载或重载时重置显示状态
    return () => {
      setShowAccessKey(false);
      setShowSecretKey(false);
    };
  }, []);

  // 保存配置
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // 创建要发送的配置副本
      const configToSave = { ...config };
      
      // 如果是隐藏状态且显示的是掩码，从服务端获取真实值
      if (!showAccessKey && configToSave.accessKeyId === '********') {
        try {
          const response = await fetch('/api/settings/current');
          if (response.ok) {
            const data = await response.json();
            if (data.config?.accessKeyId) {
              configToSave.accessKeyId = data.config.accessKeyId;
            }
          }
        } catch (error) {
          console.error('获取真实秘钥失败', error);
        }
      }
      
      if (!showSecretKey && configToSave.secretAccessKey === '********') {
        try {
          const response = await fetch('/api/settings/current');
          if (response.ok) {
            const data = await response.json();
            if (data.config?.secretAccessKey) {
              configToSave.secretAccessKey = data.config.secretAccessKey;
            }
          }
        } catch (error) {
          console.error('获取真实秘钥失败', error);
        }
      }
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: configToSave }),
      });
      
      if (response.ok) {
        toast.success("配置已保存");
        
        // 保存后重置为掩码显示
        const maskedConfig = {
          ...config,
          accessKeyId: configToSave.accessKeyId ? '********' : '',
          secretAccessKey: configToSave.secretAccessKey ? '********' : ''
        };
        
        setConfig(maskedConfig);
        setShowAccessKey(false);
        setShowSecretKey(false);
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

  // 点击显示访问密钥ID
  const handleShowAccessKey = async () => {
    // 如果当前是隐藏状态，点击显示时需要获取真实秘钥
    if (!showAccessKey) {
      try {
        const response = await fetch('/api/settings/current');
        if (response.ok) {
          const data = await response.json();
          if (data.config?.accessKeyId) {
            setConfig(prev => ({
              ...prev,
              accessKeyId: data.config.accessKeyId
            }));
          }
        }
      } catch (error) {
        console.error('获取真实秘钥失败', error);
      }
    }
    setShowAccessKey(!showAccessKey);
  };
  
  // 点击显示秘密访问密钥
  const handleShowSecretKey = async () => {
    // 如果当前是隐藏状态，点击显示时需要获取真实秘钥
    if (!showSecretKey) {
      try {
        const response = await fetch('/api/settings/current');
        if (response.ok) {
          const data = await response.json();
          if (data.config?.secretAccessKey) {
            setConfig(prev => ({
              ...prev,
              secretAccessKey: data.config.secretAccessKey
            }));
          }
        }
      } catch (error) {
        console.error('获取真实秘钥失败', error);
      }
    }
    setShowSecretKey(!showSecretKey);
  };

  return (
    <LayoutWithSidebar>
      <div className="p-4 md:p-8">
        <Toaster position="top-right" />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold">设置</h1>
          <p className="text-muted-foreground">
            配置 Cloudflare R2 连接参数
          </p>
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
                  <div className="relative">
                    <Input
                      id="accessKeyId"
                      placeholder="Access Key ID"
                      type={showAccessKey ? "text" : "password"}
                      value={config.accessKeyId}
                      onChange={(e) => {
                        // 更新输入的值
                        setConfig({ ...config, accessKeyId: e.target.value });
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                      onClick={handleShowAccessKey}
                      title={showAccessKey ? "隐藏密钥" : "显示密钥"}
                    >
                      {showAccessKey ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                          <line x1="2" x2="22" y1="2" y2="22"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    在 Cloudflare 控制台 R2 部分创建的 API 密钥的 ID
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="secretAccessKey" className="text-sm font-medium">
                    秘密访问密钥
                  </label>
                  <div className="relative">
                    <Input
                      id="secretAccessKey"
                      placeholder="Secret Access Key"
                      type={showSecretKey ? "text" : "password"}
                      value={config.secretAccessKey}
                      onChange={(e) => {
                        // 更新输入的值
                        setConfig({ ...config, secretAccessKey: e.target.value });
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                      onClick={handleShowSecretKey}
                      title={showSecretKey ? "隐藏密钥" : "显示密钥"}
                    >
                      {showSecretKey ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                          <line x1="2" x2="22" y1="2" y2="22"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
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
        
        {/* 调试信息 */}
        <div className="mt-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebugInfo(!showDebugInfo)}
          >
            {showDebugInfo ? "隐藏调试信息" : "显示调试信息"}
          </Button>
          
          {showDebugInfo && configStatus && (
            <Card className="mt-4 w-full max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>配置文件状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">配置目录</h3>
                    <p className="text-sm">路径: {configStatus.configDir?.path}</p>
                    <p className="text-sm">存在: {configStatus.configDir?.exists ? "是" : "否"}</p>
                    <p className="text-sm">可写: {configStatus.configDir?.isWritable ? "是" : "否"}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">配置文件</h3>
                    <p className="text-sm">路径: {configStatus.configFile?.path}</p>
                    <p className="text-sm">存在: {configStatus.configFile?.exists ? "是" : "否"}</p>
                    {configStatus.configFile?.stats && (
                      <p className="text-sm">
                        最后修改: {new Date(configStatus.configFile.stats.mtime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium">系统信息</h3>
                    <p className="text-sm">平台: {configStatus.systemInfo?.platform}</p>
                    <p className="text-sm">工作目录: {configStatus.systemInfo?.cwd}</p>
                    <p className="text-sm">用户目录: {configStatus.systemInfo?.homedir}</p>
                    <p className="text-sm">临时目录: {configStatus.systemInfo?.tmpdir}</p>
                    <p className="text-sm">用户名: {configStatus.systemInfo?.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </LayoutWithSidebar>
  );
} 