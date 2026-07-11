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
} from "@/components/ui/sidebar";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { signOut } from '@/lib/auth';

const menuItems = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Stories", url: "/stories", icon: PlayCircle },
  { title: "Vídeos", url: "/gallery", icon: Library },
  { title: "Performance", url: "/videos/performance", icon: BarChart3 }, // Link corrigido
  { title: "Produtos", url: "/products", icon: ShoppingCart },
  { title: "Medidas", url: "/medidas", icon: Ruler },
  { title: "Aparência", url: "/appearance", icon: Palette },
  { title: "Comentários", url: "/comments", icon: MessageSquare },
  { title: "Instalação", url: "/integration", icon: Code },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('app_settings')
          .select('settings')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        setStoreName(data?.settings?.store_name || '');
        setStoreLogoUrl(data?.settings?.store_logo_url || '');
      } catch (err) {
        console.error('Error fetching sidebar store settings:', err);
      }
    };
    fetchStoreSettings();

    const handleSettingsUpdated = () => {
      fetchStoreSettings();
    };

    window.addEventListener('storage', handleSettingsUpdated);
    window.addEventListener('focus', handleSettingsUpdated);
    return () => {
      window.removeEventListener('storage', handleSettingsUpdated);
      window.removeEventListener('focus', handleSettingsUpdated);
    };
  }, []);

  return (
    <Sidebar className="border-r border-[#E2E8F0] bg-white shadow-none">

      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#0094EB] rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-100">
            <MonitorPlay className="h-5 w-5 fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[#0F172A] tracking-tight leading-none text-lg">Vitrine Vídeo</span>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest leading-none mt-1">Sistema Loja Lucrativa</span>
          </div>
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
                        ? "bg-[#EAF6FF] text-[#0094EB] hover:bg-[#EAF6FF] hover:text-[#0094EB]" 
                        : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className={cn("h-4.5 w-4.5", location.pathname === item.url ? "text-[#0094EB]" : "text-[#94A3B8]")} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] overflow-hidden shrink-0">
            {storeLogoUrl ? (
              <img src={storeLogoUrl} alt={storeName || 'Loja'} className="h-full w-full object-cover" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#0F172A] truncate">{storeName || 'Admin'}</span>
            <span className="text-[10px] font-bold text-[#0094EB] uppercase">Plano Pro</span>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors text-sm font-bold"
        >
          <LogOut size={16} />
          Sair do Painel
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}