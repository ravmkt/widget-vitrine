import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] dark:bg-[#111524] p-4 transition-colors duration-300">
      <div className="text-center bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl shadow-xs px-10 py-14 max-w-md transition-all duration-300 hover:shadow-md">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">404</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 mb-6">Oops! Página não encontrada</p>
        <a href="/" className="text-sm font-black text-[#0091ff] dark:text-[#ff7a29] hover:underline transition-all">
          Voltar para o início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
