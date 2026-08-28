"use client";

import React from 'react';
import {
  BookOpen,
  Play,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SupportPage = () => {
  // URLs de suporte (Configure conforme os seus links reais)
  const HELP_CENTER_URL = "https://ajuda.vidlytics.com.br";
  const PLAYLIST_URL = "https://youtube.com/playlist?list=sua-playlist-aqui";
  const WHATSAPP_URL = "https://wa.me/5541999999999?text=Ol%C3%A1%2C+preciso+de+suporte+com+o+Vidlytics.";

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Suporte e Central de Ajuda
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
          Precisa de uma mãozinha? Acesse nossos tutoriais ou fale diretamente com o nosso time de especialistas.
        </p>
      </div>

      {/* ── GRID DE TRÊS CARDS PRINCIPAIS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: ARTIGOS / CENTRAL DE AJUDA */}
        <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div className="space-y-5">
            {/* Ícone com background sutil */}
            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0094EB] flex items-center justify-center shrink-0">
              <BookOpen size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Central de Ajuda
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                Explore dezenas de artigos, guias passo a passo e resolva suas dúvidas técnicas sobre pixel, importação e faturamento em minutos.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <a
              href={HELP_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-50 dark:bg-[#0f1220] border border-slate-100 dark:border-white/5 hover:border-[#0094EB] dark:hover:border-[#ff7a29]/50 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] transition-all hover:scale-[1.02] cursor-pointer"
            >
              Acessar Artigos
              <ExternalLink size={13} className="text-[#0094EB] dark:text-[#ff7a29]" />
            </a>
          </div>
        </div>

        {/* CARD 2: PLAYLIST DE TREINAMENTO */}
        <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div className="space-y-5">
            {/* Ícone com background sutil */}
            <div className="h-14 w-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-500 flex items-center justify-center shrink-0">
              <Play size={28} className="stroke-[2.5] fill-current" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Tutoriais em Vídeo
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                Prefere assistir? Temos uma playlist completa de onboarding mostrando na prática como otimizar seus vídeos para estourar de vender.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <a
              href={PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-50 dark:bg-[#0f1220] border border-slate-100 dark:border-white/5 hover:border-violet-500 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] transition-all hover:scale-[1.02] cursor-pointer"
            >
              Ver Playlist
              <ExternalLink size={13} className="text-violet-500" />
            </a>
          </div>
        </div>

        {/* CARD 3: CHAMO NO WHATSAPP */}
        <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div className="space-y-5">
            {/* Ícone com background sutil */}
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
              <MessageCircle size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Fale Conosco
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                Teve alguma dificuldade técnica ou deseja sugerir uma melhoria? Fale com um especialista agora mesmo no suporte individual.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer"
            >
              Chamar no WhatsApp
            </a>
          </div>
        </div>

      </div>

      {/* ── SEÇÃO INFORMATIVA SUTIL DE "SABIA QUE?" ── */}
      <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2.5rem] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
        <div className="flex gap-4 items-start sm:items-center">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0">
            <HelpCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Antes de chamar no suporte...
            </h4>
            <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] mt-0.5">
              Certifique-se de que concluiu todas as etapas do seu <strong className="text-slate-600 dark:text-white">Checklist de Ativação</strong> para garantir que seu pixel e scripts estejam ativos.
            </p>
          </div>
        </div>
        <div className="shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-[#0094EB] dark:text-[#ff7a29] hover:opacity-80 transition-all cursor-pointer"
          >
            Ir para o Dashboard <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
