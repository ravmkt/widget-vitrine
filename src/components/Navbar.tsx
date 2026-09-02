import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';

const Navbar = () => {
  const location = useLocation();

  const getBreadcrumb = (path: string) => {
    if (path.includes('dashboard')) return 'Visão Geral';
    if (path.includes('stories')) return 'Stories';
    if (path.includes('gallery')) return 'Vídeos';
    if (path.includes('videos/performance')) return 'Performance de Vídeos';
    if (path.includes('videos/') && path.includes('edit')) return 'Editar Vídeo';
    if (path.includes('products')) return 'Produtos';
    if (path.includes('appearance')) return 'Aparência';
    if (path.includes('medidas')) return 'Medidas';
    if (path.includes('comments')) return 'Comentários';
    if (path.includes('integration')) return 'Instalação';
    if (path.includes('settings')) return 'Configurações';
    return 'Página';
  };

  return (
    <header className="bg-white dark:bg-[#111524] border-b border-slate-200 dark:border-[#ff7a29]/30 h-20 flex items-center px-4 md:px-8 sticky top-0 z-40 transition-colors duration-300">
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4">
           <SidebarTrigger className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 transition-colors" />
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <span className="hidden sm:inline">Vitrine Vídeo</span>
              <ChevronRight size={14} className="hidden sm:inline" />
              <span className="text-[#0091ff] dark:text-[#ff7a29]">{getBreadcrumb(location.pathname)}</span>
           </div>
        </div>


      </div>
    </header>
  );
};

export default Navbar;
