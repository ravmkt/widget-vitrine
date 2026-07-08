import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronRight, 
  Bell, 
  User, 
  Search,
  MonitorPlay
} from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const getBreadcrumb = (path: string) => {
    if (path.includes('dashboard')) return 'Visão Geral';
    if (path.includes('stories')) return 'Meus Stories';
    if (path.includes('gallery')) return 'Vídeos';
    if (path.includes('products')) return 'Produtos';
    if (path.includes('appearance')) return 'Aparência';
    if (path.includes('medidas')) return 'Medidas';
    if (path.includes('comments')) return 'Comentários';
    if (path.includes('integration')) return 'Instalação';
    if (path.includes('settings')) return 'Configurações';
    return 'Página';
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex items-center gap-4">
             <div className="flex lg:hidden items-center gap-2">
                <MonitorPlay className="h-6 w-6 text-[#0094EB]" />
                <span className="font-bold text-slate-900">Vitrine</span>
             </div>
             <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Vitrine Vídeo</span>
                <ChevronRight size={14} />
                <span className="text-[#0094EB]">{getBreadcrumb(location.pathname)}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0094EB] w-64"
              />
            </div>
            
            <button className="p-2 rounded-full text-slate-400 hover:bg-slate-50 transition-colors">
              <Bell size={20} />
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-1" />
            
            <button className="flex items-center gap-2 pl-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900">Admin</span>
                <span className="text-[10px] font-medium text-slate-400">Plano Pro</span>
              </div>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;