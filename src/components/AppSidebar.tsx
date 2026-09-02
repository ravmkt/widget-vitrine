import {
  LayoutDashboard, 
  PlayCircle, 
  Library, 
  Palette, 
  Settings, 
  Code, 
  ShoppingCart,
  MessageSquare,
  User,
  LogOut,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import {
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
import { useNavigate } from 'react-router-dom';
import { Ruler } from 'lucide-react';
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Estrutura de navegação por grupos (Métricas, Operação e Ajustes)
const menuGroups = [
  {
    label: "MÉTRICAS",
    items: [
      { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
      { title: "Resultados", url: "/videos/performance", icon: BarChart3 },
    ],
  },
  {
    label: "OPERAÇÃO",
    items: [
      { title: "Stories", url: "/stories", icon: PlayCircle },
      { title: "Biblioteca", url: "/armazenamento", icon: Library },
      { title: "Produtos", url: "/produtos", icon: ShoppingCart },
      { title: "Comentários", url: "/comentarios", icon: MessageSquare },
    ],
  },
  {
    label: "AJUSTES",
    items: [
      { title: "Aparência", url: "/aparencia", icon: Palette },
      { title: "Instalação", url: "/integration", icon: Code },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const [storeName, setStoreName] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [planName, setPlanName] = useState('Plano Iniciante');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const isExpanded = !isCollapsed;

  const loadStoreData = useCallback(async () => {
    try {
      if (!supabase) return;

      // 1. Prioriza o usuário autenticado na sessão atual (isolamento multi-tenant seguro)
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setStoreName('');
        setStoreLogoUrl('');
        setPlanName('Plano Iniciante');
        return;
      }

      // 2. Busca a loja vinculada estritamente ao owner_user_id logado
      const { data: userStore } = await supabase
        .from('stores')
        .select('id, name, logo_url, plan_id, plans(name)')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userStore) {
        localStorage.setItem('vidlytics_current_store_id', userStore.id);
        setStoreName(userStore.name || 'Minha Loja');
        setStoreLogoUrl((userStore as any).logo_url || '');
        if ((userStore as any).plans?.name) {
          setPlanName((userStore as any).plans.name);
        }
      } else {
        setStoreName('Minha Loja');
        setStoreLogoUrl('');
        setPlanName('Plano Iniciante');
      }
    } catch (err) {
      console.error('Erro ao carregar dados da loja no AppSidebar:', err);
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
        isExpanded ? "w-64 overflow-x-hidden" : "w-20 overflow-visible"
      )}
    >
      <SidebarHeader className="p-4 flex flex-col gap-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? (
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-9 w-auto max-w-none object-contain transition-all duration-300"
            />
          ) : (
            <div className="w-full flex justify-center py-0.5">
              <img
                src="/assets/vidlytics-logo-ico.png"
                alt="V"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.classList.remove('hidden');
                }}
                className="h-8 w-8 object-contain shrink-0"
              />
              <div className="hidden h-8 w-8 shrink-0 rounded-xl bg-[#0094EB] flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 text-xs">
                V
              </div>
            </div>
          )}
        </div>

        {/* Botão de Recolher / Expandir Destacado */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all shadow-sm w-full",
              isExpanded
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                : "bg-[#0094EB] dark:bg-[#fd8539] text-white hover:bg-[#0E4787] dark:hover:bg-[#e07128] shadow-blue-500/20"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={16} className="shrink-0 text-white" />
            ) : (
              <>
                <PanelLeftClose size={16} className="shrink-0 text-[#0094EB] dark:text-[#fd8539]" />
                <span className="truncate">Recolher</span>
              </>
            )}
          </button>

          {/* Tooltip flutuante adaptável ao tema */}
          {!isExpanded && (
            <div className="fixed left-20 hidden group-hover:flex items-center z-[999999] pointer-events-none transform -translate-y-full mt-3">
              <div className="bg-[#0094EB] dark:bg-[#fd8539] text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-2xl shadow-blue-500/50 whitespace-nowrap border border-white/20 flex items-center gap-1.5 ml-2 animate-in fade-in zoom-in-95 duration-150">
                Expandir menu
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("px-3 py-2 overflow-y-auto [&::-webkit-scrollbar]:hidden", isExpanded ? "overflow-x-hidden" : "overflow-x-visible")}>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label} className="px-0 py-2 first:pt-0">
            {isExpanded && (
              <div className="px-3.5 py-1 text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none mb-1">
                {group.label}
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item) => {
const isItemActive =
  location.pathname === item.url ||
  (item.url === "/produtos" && location.pathname === "/medidas");
                  return (
                    <SidebarMenuItem key={item.title} className="relative group">
                      <SidebarMenuButton 
                        asChild 
                        isActive={isItemActive}
                        className={cn(
                          "h-11 rounded-xl px-3.5 transition-all duration-200 font-black overflow-hidden",
                          isItemActive 
                            ? "!bg-[#0094EB] dark:!bg-[#ff7a29] !text-white shadow-md shadow-blue-500/20 dark:shadow-orange-500/30 hover:!bg-[#0094EB] dark:hover:!bg-[#ff7a29]" 
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <Link to={item.url} className="flex items-center gap-3 w-full">
                          <item.icon 
                            className={cn(
                              "h-4.5 w-4.5 shrink-0 transition-colors",
                              isItemActive ? "!text-white stroke-[2.5]" : "text-slate-400 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white"
                            )} 
                          />
                          <span
                            className={cn(
                              "text-sm whitespace-nowrap transition-all duration-300 font-black",
                              isItemActive ? "!text-white" : "",
                              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                            )}
                          >
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>

                      {/* Tooltip flutuante no modo recolhido (Azul no Light / Laranja no Dark) */}
                      {!isExpanded && (
                        <div className="fixed left-20 hidden group-hover:flex items-center z-[999999] pointer-events-none transform -translate-y-full mt-5">
                          <div className="bg-[#0094EB] dark:bg-[#ff7a29] text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-2xl shadow-blue-500/40 dark:shadow-orange-500/50 whitespace-nowrap border border-white/20 flex items-center gap-1.5 ml-2 animate-in fade-in zoom-in-95 duration-150">
                            {item.title}
                          </div>
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-[#F1F5F9] dark:border-slate-800 overflow-hidden shrink-0">
        <div className="relative group mb-3">
          <Link
            to="/billing"
            className={cn(
              "flex items-center gap-3 min-w-0 p-1.5 -m-1.5 rounded-xl transition-all duration-200 cursor-pointer",
              location.pathname === "/billing"
                ? "bg-[#EAF6FF] dark:bg-[#fd8539]/20"
                : "hover:bg-[#F8FAFC] dark:hover:bg-slate-900"
            )}
          >
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
              <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate group-hover:text-[#0094EB] dark:group-hover:text-[#fd8539] transition-colors">
                {storeName || 'Minha Loja'}
              </span>
              <span className="text-[10px] font-black text-[#0094EB] dark:text-[#fd8539] uppercase tracking-wide">
                {planName}
              </span>
            </div>
          </Link>

          {/* Tooltip flutuante no modo recolhido */}
          {!isExpanded && (
            <div className="fixed left-20 hidden group-hover:flex items-center z-[999999] pointer-events-none transform -translate-y-full mt-4">
              <div className="bg-[#0094EB] dark:bg-[#fd8539] text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-2xl shadow-blue-500/50 whitespace-nowrap border border-white/20 flex items-center gap-1.5 ml-2 animate-in fade-in zoom-in-95 duration-150">
                Minha Assinatura / Financeiro
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={async () => {
              try {
                if (supabase) {
                  await supabase.auth.signOut();
                }
              } catch (_) {}
              try {
                const theme = localStorage.getItem('app-theme');
                localStorage.clear();
                sessionStorage.clear();
                if (theme) localStorage.setItem('app-theme', theme);
              } catch (_) {}
              window.location.href = '/login';
            }}
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

          {!isExpanded && (
            <div className="fixed left-20 hidden group-hover:flex items-center z-[999999] pointer-events-none transform -translate-y-full mt-5">
              <div className="bg-[#0094EB] text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-2xl shadow-blue-500/50 whitespace-nowrap border border-white/20 flex items-center gap-1.5 ml-2 animate-in fade-in zoom-in-95 duration-150">
                Sair do Painel
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </div>
  );
}
