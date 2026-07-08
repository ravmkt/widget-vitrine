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
  ChevronRight,
  Database
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
  { group: "Video Commerce", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Meus Stories", url: "/stories", icon: PlayCircle },
    { title: "Galeria de Vídeos", url: "/videos", icon: Library },
    { title: "Modelos de Estilo", url: "/styles", icon: Palette },
  ]},
  { group: "Widget & Publicação", items: [
    { title: "Instalar Widget", url: "/widget/install", icon: Code },
    { title: "Preview Global", url: "/widget/preview", icon: Eye },
  ]},
  { group: "Integrações", items: [
    { title: "Produtos Yampi", url: "/products", icon: ShoppingCart },
    { title: "Configuração API", url: "/settings/yampi", icon: Database },
  ]}
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset" className="border-r border-slate-100 shadow-sm">
      <SidebarHeader className="p-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[1rem] flex items-center justify-center text-white shadow-xl shadow-violet-200">
            <PlayCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 tracking-tighter leading-none text-xl">VIDEO</span>
            <span className="text-[10px] font-black text-violet-600 uppercase tracking-[0.3em] leading-none mt-1">Commerce</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4">
        {menuItems.map((group) => (
          <SidebarGroup key={group.group} className="mb-6">
            <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                      className={`h-12 rounded-[1.2rem] px-5 transition-all duration-300 ${
                        location.pathname === item.url 
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-100 font-bold hover:bg-violet-700" 
                          : "text-slate-600 hover:bg-slate-100 font-bold"
                      }`}
                    >
                      <Link to={item.url}>
                        <item.icon className={`h-5 w-5 ${location.pathname === item.url ? "text-white" : "text-slate-400"}`} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-8">
        <div className="bg-slate-950 rounded-[1.5rem] p-4 text-white">
          <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold">Produção Ativa</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}