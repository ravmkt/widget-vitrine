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
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Stories", url: "/stories", icon: PlayCircle },
  { title: "Vídeos", url: "/gallery", icon: Library },
  { title: "Produtos", url: "/products", icon: ShoppingCart },
  { title: "Medidas", url: "/medidas", icon: Ruler },
  { title: "Aparência", url: "/appearance", icon: Palette },
  { title: "Comentários", url: "/comments", icon: MessageSquare },
  { title: "Instalação", url: "/integration", icon: Code },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

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
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B] mb-4">
            Menu Principal
          </SidebarGroupLabel>
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
          <div className="h-9 w-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
            <User size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#0F172A] truncate">Admin</span>
            <span className="text-[10px] font-bold text-[#0094EB] uppercase">Plano Pro</span>
          </div>
        </div>
        <button className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors text-sm font-bold">
          <LogOut size={16} />
          Sair do Painel
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}