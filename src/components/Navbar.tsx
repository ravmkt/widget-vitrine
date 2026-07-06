import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Film, Settings, Sparkles, Database } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/db';

const Navbar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/stories', label: 'Stories', icon: Film },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2 rounded-xl text-white shadow-md shadow-violet-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Vidlytics
              </span>
              <span className="text-xs block text-gray-400 font-medium -mt-1">Stories Admin</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-50 text-violet-600 shadow-sm shadow-violet-50/50'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Supabase Status Badge */}
          <div className="hidden md:flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isSupabaseConfigured 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              <Database className="w-3.5 h-3.5" />
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo de Demonstração'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;