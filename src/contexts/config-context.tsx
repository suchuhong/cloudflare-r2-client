"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

interface R2Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface ConfigContextType {
  config: R2Config | null;
  isConfigValid: boolean;
  isLoading: boolean;
  reloadConfig: () => Promise<void>;
  saveConfig: (config: R2Config) => Promise<boolean>;
}

const defaultConfig: R2Config = {
  endpoint: "",
  region: "auto",
  accessKeyId: "",
  secretAccessKey: "",
  bucketName: ""
};

// Function to get environment variables (works in Next.js)
const getEnvConfig = (): Partial<R2Config> => {
  if (typeof process !== 'undefined' && process.env) {
    return {
      endpoint: process.env.NEXT_PUBLIC_R2_ENDPOINT || "",
      region: process.env.NEXT_PUBLIC_R2_REGION || "auto",
      accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY || "",
      bucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || ""
    };
  }
  return {};
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<R2Config | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    try {
      setIsLoading(true);

      // 从 localStorage 获取配置 (仅客户端)
      if (typeof window !== 'undefined') {
        const storedConfig = localStorage.getItem('r2-config');
        
        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig) as R2Config;
          setConfig(parsedConfig);
          
          // 检查配置是否有效
          if (parsedConfig.endpoint && 
              parsedConfig.accessKeyId && 
              parsedConfig.secretAccessKey && 
              parsedConfig.bucketName) {
            setIsConfigValid(true);
          } else {
            setIsConfigValid(false);
          }
        } else {
          // 如果没有存储的配置，则从环境变量中获取默认配置
          const envConfig = getEnvConfig();
          const mergedConfig = { ...defaultConfig, ...envConfig };
          
          setConfig(mergedConfig);
          
          // 检查从环境变量合并的配置是否有效
          setIsConfigValid(
            !!(mergedConfig.endpoint && 
              mergedConfig.accessKeyId && 
              mergedConfig.secretAccessKey && 
              mergedConfig.bucketName)
          );
          
          // 如果环境变量中有有效配置，自动保存到localStorage
          if (mergedConfig.endpoint && 
              mergedConfig.accessKeyId && 
              mergedConfig.secretAccessKey && 
              mergedConfig.bucketName) {
            localStorage.setItem('r2-config', JSON.stringify(mergedConfig));
          }
        }
      } else {
        // 服务器端渲染时使用环境变量配置
        const envConfig = getEnvConfig();
        const mergedConfig = { ...defaultConfig, ...envConfig };
        setConfig(mergedConfig);
        
        setIsConfigValid(
          !!(mergedConfig.endpoint && 
            mergedConfig.accessKeyId && 
            mergedConfig.secretAccessKey && 
            mergedConfig.bucketName)
        );
      }
    } catch (error) {
      console.error("Failed to load config:", error);
      toast.error("加载配置失败");
      
      // 获取环境变量作为回退
      const envConfig = getEnvConfig();
      const mergedConfig = { ...defaultConfig, ...envConfig };
      setConfig(mergedConfig);
      
      setIsConfigValid(
        !!(mergedConfig.endpoint && 
          mergedConfig.accessKeyId && 
          mergedConfig.secretAccessKey && 
          mergedConfig.bucketName)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: R2Config): Promise<boolean> => {
    try {
      // 保存到 localStorage (仅客户端)
      if (typeof window !== 'undefined') {
        localStorage.setItem('r2-config', JSON.stringify(newConfig));
      }
      
      setConfig(newConfig);
      setIsConfigValid(
        !!(newConfig.endpoint && 
          newConfig.accessKeyId && 
          newConfig.secretAccessKey && 
          newConfig.bucketName)
      );
      
      return true;
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("保存配置失败");
      return false;
    }
  };

  // 初始加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ 
      config, 
      isConfigValid, 
      isLoading, 
      reloadConfig: loadConfig,
      saveConfig
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  
  return context;
} 