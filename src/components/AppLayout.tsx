import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MadeWithDyad } from "./made-with-dyad";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center px-6">
            <SidebarTrigger className="text-slate-500 hover:text-violet-600 transition-colors" />
            <div className="ml-auto flex items-center gap-4">
              <div className="h-8 w-[1px] bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente de Produção</span>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-10">
            {children}
          </main>
          <MadeWithDyad />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}