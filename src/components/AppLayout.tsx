import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import Navbar from './Navbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F7FAFC]">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <Navbar />
          <main className="flex-1 p-4 md:p-8 animate-fade-in">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}