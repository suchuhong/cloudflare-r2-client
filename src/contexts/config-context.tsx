"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<R2Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings");
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        console.error("Failed to load config");
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 检查配置是否有效
  const isConfigValid = Boolean(
    config?.endpoint &&
    config?.accessKeyId &&
    config?.secretAccessKey &&
    config?.bucketName
  );

  return (
    <ConfigContext.Provider
      value={{
        config,
        isConfigValid,
        isLoading,
        reloadConfig: loadConfig,
      }}
    >
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