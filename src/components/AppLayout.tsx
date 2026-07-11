import React from 'react';
import { AppSidebar } from './AppSidebar';
import FloatingSupportButton from './FloatingSupportButton';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TenantProvider } from '@/context/TenantContext';
import { AuthProvider } from '@/context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthProvider>
      <TenantProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-[#F7FAFC]">
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
        </SidebarProvider>
      </TenantProvider>
    </AuthProvider>
  );
}