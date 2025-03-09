"use client";

import React from "react";
import { Sidebar } from "./sidebar";

interface LayoutWithSidebarProps {
  children: React.ReactNode;
}

export function LayoutWithSidebar({ children }: LayoutWithSidebarProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-16 md:pl-60">
        {children}
      </div>
    </div>
  );
} 