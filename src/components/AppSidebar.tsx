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
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen
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
} from "@/components/ui/sidebar";
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

  const [isCollapsed, setIsCollapsed] = useState(false);

  const isExpanded = !isCollapsed;

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
    <div
      className={cn(
        "h-screen sticky top-0 border-r border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 z-30 select-none",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      <SidebarHeader className="p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {isExpanded ? (
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-10 w-auto max-w-none transition-all duration-300"
            />
          ) : (
            <img
              src="/assets/vidlytics-logo-ico.png"
              alt="Vidlytics"
              className="h-9 w-9 object-contain shrink-0"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 dark:hover:text-white transition-colors shrink-0"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
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
                    title={!isExpanded ? item.title : undefined}
                    className={cn(
                      "h-11 rounded-xl px-3.5 transition-all duration-200 font-bold overflow-hidden whitespace-nowrap",
                      location.pathname === item.url 
                        ? "bg-[#EAF6FF] dark:bg-[#0094EB]/20 text-[#0094EB] hover:bg-[#EAF6FF] dark:hover:bg-[#0094EB]/20 hover:text-[#0094EB]" 
                        : "text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-4.5 w-4.5 shrink-0",
                        location.pathname === item.url 
                          ? "text-[#0094EB]" 
                          : "text-[#94A3B8] dark:text-slate-500"
                      )} />
                      <span
                        className={cn(
                          "text-sm transition-all duration-300",
                          isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                        )}
                      >
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-[#F1F5F9] dark:border-slate-800 overflow-hidden">
        <div className="flex items-center gap-3 mb-4 min-w-0">
          <div className="h-9 w-9 rounded-full bg-[#F1F5F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center text-[#64748B] dark:text-slate-400 overflow-hidden shrink-0">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName || 'Loja'} className="h-full w-full object-cover" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div
            className={cn(
              "flex flex-col min-w-0 transition-all duration-300 whitespace-nowrap",
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}
          >
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
          title={!isExpanded ? "Sair do Painel" : undefined}
          className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition-colors text-sm font-bold overflow-hidden whitespace-nowrap"
        >
          <LogOut size={16} className="shrink-0" />
          <span
            className={cn(
              "transition-all duration-300",
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}
          >
            Sair do Painel
          </span>
        </button>
</SidebarFooter>
    </div>
  );
}