'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { ConfigProvider } from '@/contexts/config-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConfigProvider>
        {children}
      </ConfigProvider>
    </ThemeProvider>
  );
} 