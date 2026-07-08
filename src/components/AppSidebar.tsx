import { 
  LayoutDashboard, 
  PlayCircle, 
  Library, 
  PlusCircle, 
  Palette, 
  Settings, 
  Code, 
  Eye, 
  ShoppingCart,
  ChevronRight
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Produtos Yampi", url: "/products", icon: ShoppingCart },
  { title: "Gerenciar Stories", url: "/stories", icon: PlayCircle },
  { title: "Galeria de Vídeos", url: "/videos", icon: Library },
  { title: "Novo Story", url: "/stories/new", icon: PlusCircle },
  { title: "Modelos de Estilo", url: "/styles", icon: Palette },
  { title: "Configuração Yampi", url: "/settings/yampi", icon: Settings },
  { title: "Instalar Widget", url: "/widget/install", icon: Code },
  { title: "Preview Widget", url: "/widget/preview", icon: Eye },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset" className="border-r border-slate-200">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <PlayCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 tracking-tight leading-none text-lg">VIDEO</span>
            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-[0.2em] leading-none mt-1">Commerce</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 gap-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className={`h-11 rounded-xl px-4 transition-all ${
                      location.pathname === item.url 
                        ? "bg-violet-50 text-violet-700 font-bold" 
                        : "text-slate-600 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <Link to={item.url}>
                      <item.icon className={`h-5 w-5 ${location.pathname === item.url ? "text-violet-600" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                      {location.pathname === item.url && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-6 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-black text-xs">AD</div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-slate-900 truncate">Admin User</span>
            <span className="text-[10px] text-slate-400 truncate">admin@shop.com</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}