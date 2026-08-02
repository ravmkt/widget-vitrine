import React, { useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import FloatingSupportButton from './FloatingSupportButton';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // ═══════════════════════════════════════════════
  // 🌗 APLICA O TEMA SALVO AO CARREGAR QUALQUER PÁGINA
  // ═══════════════════════════════════════════════
  useEffect(() => {
    try {
      const theme = localStorage.getItem('app-theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    } catch {}
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <main className="flex-1 p-4 md:p-8 animate-fade-in relative">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
            <FloatingSupportButton />
          </main>
        </SidebarInset>
      </div>
      <Toaster position="top-center" richColors duration={3000} />
    </SidebarProvider>
  );
}
