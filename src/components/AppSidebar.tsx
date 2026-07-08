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
  MonitorPlay
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

const menuItems = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meus Stories", url: "/stories", icon: PlayCircle },
  { title: "Vídeos", url: "/gallery", icon: Library },
  { title: "Produtos", url: "/products", icon: ShoppingCart },
  { title: "Aparência", url: "/appearance", icon: Palette },
  { title: "Medidas", url: "/medidas", icon: Ruler },
  { title: "Comentários", url: "/comments", icon: MessageSquare },
  { title: "Instalação", url: "/integration", icon: Code },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset" className="border-r border-slate-200 bg-white shadow-none">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#0094EB] rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-200">
            <MonitorPlay className="h-5 w-5 fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-slate-900 tracking-tight leading-none text-lg">Vitrine Vídeo</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Sistema Loja Lucrativa</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className={`h-11 rounded-xl px-4 transition-all duration-200 ${
                      location.pathname === item.url 
                        ? "bg-[#0094EB] text-white shadow-sm font-bold hover:bg-[#0E4787] hover:text-white" 
                        : "text-slate-600 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <Link to={item.url}>
                      <item.icon className={`h-4.5 w-4.5 ${location.pathname === item.url ? "text-white" : "text-slate-400"}`} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status: Online</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 leading-tight">Widget ativo e sincronizado com o e-commerce.</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}