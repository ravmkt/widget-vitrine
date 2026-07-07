Section', and the exactly requested 9 navigation modules.">
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Settings,
  Sparkles,
  Database,
  GalleryVertical,
  Palette,
  ShoppingBag,
  BarChart3,
  MessageSquare,
  Link2,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/db';

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/stories', label: 'Stories', icon: Film },
    { path: '/gallery', label: 'Galeria', icon: GalleryVertical },
    { path: '/products', label: 'Produtos', icon: ShoppingBag },
    { path: '/appearance', label: 'Aparência', icon: Palette },
    { path: '/medidas', label: 'Medidas', icon: BarChart3 },
    { path: '/comments', label: 'Comentários', icon: MessageSquare },
    { path: '/integration', label: 'Integração', icon: Link2 },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  // Dynamic high-fidelity breadcrumbs logic mapping
  const getBreadcrumbs = (pathname: string) => {
    const segments = ['Aplicativos'];
    if (pathname === '/dashboard') segments.push('Dashboard');
    else if (pathname === '/stories') segments.push('Stories');
    else if (pathname.startsWith('/stories/')) segments.push('Stories', 'Editar Story');
    else if (pathname === '/gallery') segments.push('Galeria de Vídeos');
    else if (pathname === '/products') segments.push('Produtos');
    else if (pathname === '/appearance') segments.push('Aparência');
    else if (pathname === '/medidas') segments.push('Medidas');
    else if (pathname === '/comments') segments.push('Comentários');
    else if (pathname === '/integration') segments.push('Integração');
    else if (pathname === '/settings') segments.push('Configurações');
    else segments.push('Início');
    return segments;
  };

  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top/Main navbar section */}
        <div className="flex justify-between h-16 items-center">
          
          {/* Brand/Logo */}
          <Link to="/" className="flex items-center gap-2.5 focus:outline-none group">
            <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2 rounded-xl text-white shadow-lg shadow-violet-500/10 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black tracking-wider text-lg bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Vidlytics
              </span>
              <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider -mt-1">Video Commerce</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/stories' && location.pathname.startsWith('/stories/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-600/15 border border-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/5'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Database Status & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isSupabaseConfigured 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
            }`}>
              <Database className="w-3.5 h-3.5" />
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Demonstração'}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Dynamic Interactive Breadcrumbs Row */}
        <div className="flex items-center gap-1.5 py-2.5 border-t border-slate-900/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {breadcrumbs.map((segment, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
              <span className={idx === breadcrumbs.length - 1 ? 'text-violet-400 font-extrabold' : 'hover:text-slate-300'}>
                {segment}
              </span>
            </React.Fragment>
          ))}
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-900 px-4 py-3 space-y-1.5 shadow-2xl animate-fade-in">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          
          <div className="pt-4 mt-3 border-t border-slate-900 flex justify-center">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
              isSupabaseConfigured 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
            }`}>
              <Database className="w-3.5 h-3.5" />
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Demonstração'}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;