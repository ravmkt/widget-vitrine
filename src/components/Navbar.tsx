import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ChevronRight, 
  Bell, 
  User, 
  HelpCircle
} from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';

const Navbar = () => {
  const location = useLocation();

  const getBreadcrumb = (path: string) => {
    if (path.includes('dashboard')) return 'Visão Geral';
    if (path.includes('stories')) return 'Stories';
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
    <header className="bg-white border-b border-[#E2E8F0] h-20 flex items-center px-4 md:px-8 sticky top-0 z-40">
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4">
           <SidebarTrigger className="lg:hidden p-2 hover:bg-[#F1F5F9] rounded-lg text-[#64748B]" />
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
              <span className="hidden sm:inline">Vitrine Vídeo</span>
              <ChevronRight size={14} className="hidden sm:inline" />
              <span className="text-[#0094EB]">{getBreadcrumb(location.pathname)}</span>
           </div>
        </div>

        <div className="flex items-center gap-2 md:gap-5">
          <div className="flex items-center gap-1">
            <button className="p-2.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-[#0094EB] rounded-full border-2 border-white" />
            </button>
            <button className="p-2.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
              <HelpCircle size={18} />
            </button>
            <button className="p-2.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
              <User size={18} />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Navbar;