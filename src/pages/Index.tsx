import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShieldCheck, ShoppingCart, ArrowRight, Zap, Lock } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-violet-100 selection:text-violet-900">
      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center space-y-10">
        <div className="inline-flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm animate-fade-in">
          <ShieldCheck className="h-4 w-4 text-violet-600" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">Conexão Segura Ativa</span>
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-tight max-w-4xl animate-slide-up">
          Integração Yampi <br />
          <span className="text-violet-600">Proxy Backend</span>
        </h1>
        
        <p className="text-lg lg:text-xl text-slate-500 font-medium max-w-2xl animate-slide-up delay-100">
          Sincronize seus produtos da Yampi sem expor suas chaves de API no frontend. 
          Performance e segurança para seu e-commerce.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up delay-200">
          <Button asChild size="lg" className="rounded-2xl px-8 h-14 text-base font-black bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200">
            <Link to="/products">
              Ver Produtos <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl px-8 h-14 text-base font-black border-slate-200 hover:bg-white">
            <a href="https://github.com" target="_blank" rel="noreferrer">
              Documentação
            </a>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 w-full animate-fade-in delay-300">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 text-left group hover:border-violet-200 transition-colors">
            <div className="h-12 w-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Segurança Total</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Seus tokens Yampi ficam armazenados apenas no servidor Nitro, nunca chegando ao navegador do cliente.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 text-left group hover:border-violet-200 transition-colors">
            <div className="h-12 w-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Nitro Powered</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Camada de API ultra-rápida construída sobre o motor Nitro, garantindo baixa latência em todas as requisições.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 text-left group hover:border-violet-200 transition-colors">
            <div className="h-12 w-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Sync Automático</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Mapeamento inteligente de campos: preços, imagens e links de checkout normalizados para sua interface.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
