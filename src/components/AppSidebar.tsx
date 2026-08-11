import {
  LayoutDashboard, 
  PlayCircle, 
  Library, 
  Palette, 
  Settings, 
  Code, 
  ShoppingCart,
  MessageSquare,
  Ruler,
  MonitorPlay,
  User,
  LogOut,
  BarChart3
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { signOut } from '@/lib/auth';

const menuItems = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Stories", url: "/stories", icon: PlayCircle },
  { title: "Galeria", url: "/gallery", icon: Library },
  { title: "Performance", url: "/videos/performance", icon: BarChart3 },
  { title: "Produtos", url: "/produtos", icon: ShoppingCart },
  { title: "Medidas", url: "/medidas", icon: Ruler },
  { title: "Aparência", url: "/aparencia", icon: Palette },
  { title: "Comentários", url: "/comentarios", icon: MessageSquare },
  { title: "Instalação", url: "/integration", icon: Code },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');

  const loadStoreData = useCallback(async () => {
    try {
      const settings = await db.getSettings();
      if (settings) {
        setStoreName(settings.store_name || '');
        setStoreLogoUrl(settings.logo_url || '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados da loja:', err);
    }
  }, []);

  useEffect(() => {
    loadStoreData();

    const handleStorageChange = () => loadStoreData();
    const handleFocus = () => loadStoreData();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadStoreData]);

  return (
    <Sidebar className="border-r border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-950 shadow-none">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <img src="/assets/vidlytics-logo-wide.png" alt="Vidlytics" className="h-[58px] w-auto max-w-[260px]" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className={cn(
                      "h-11 rounded-xl px-4 transition-all duration-200 font-bold",
                      location.pathname === item.url 
                        ? "bg-[#EAF6FF] dark:bg-[#0094EB]/20 text-[#0094EB] hover:bg-[#EAF6FF] dark:hover:bg-[#0094EB]/20 hover:text-[#0094EB]" 
                        : "text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white"
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className={cn(
                        "h-4.5 w-4.5",
                        location.pathname === item.url 
                          ? "text-[#0094EB]" 
                          : "text-[#94A3B8] dark:text-slate-500"
                      )} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-[#F1F5F9] dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-full bg-[#F1F5F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center text-[#64748B] dark:text-slate-400 overflow-hidden shrink-0">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName || 'Loja'} className="h-full w-full object-cover" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate">{storeName || 'Admin'}</span>
            <span className="text-[10px] font-bold text-[#0094EB] uppercase">Plano Pro</span>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('vidlytics_')) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            navigate('/login');
          }}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition-colors text-sm font-bold"
        >
          <LogOut size={16} />
          Sair do Painel
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
