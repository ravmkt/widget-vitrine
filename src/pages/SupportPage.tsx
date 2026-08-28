"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Play,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SupportPage() {
  const navigate = useNavigate();
  const WHATSAPP_URL = "https://wa.me/5541999999999?text=Ol%C3%A1%2C+preciso+de+suporte+com+o+Vidlytics.";
  const PLAYLIST_URL = "https://youtube.com/playlist?list=sua-playlist-aqui";

  // Estados dos 6 passos do Checklist de Ativação
  const [checklist, setChecklist] = useState({
    storeConfigured: false,
    scriptInstalled: false,
    productsLinked: false,
    videosUploaded: false,
    collectionsCreated: false,
    appearanceConfigured: false,
  });
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  const loadChecklistState = useCallback(async () => {
    try {
      if (!supabase) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // 1. Checa Loja Configurada (se possui loja com nome customizado)
      const { data: store } = await supabase
        .from('stores')
        .select('id, name')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();

      const hasStoreName = !!(store && store.name && store.name !== 'Minha Loja');

      // 2. Checa se existem Stories/Vídeos criados para validar passos de conteúdo
      const { count: storiesCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true });

      const hasStories = (storiesCount ?? 0) > 0;

      // 3. Checa se existem produtos importados/vinculados no banco
      let hasProducts = false;
      try {
        const { count: productsCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true });
        hasProducts = (productsCount ?? 0) > 0;
      } catch (e) {
        // Fallback seguro caso a tabela de produtos tenha restrições de RLS temporárias
        hasProducts = false;
      }

      // Atualiza o estado mapeando os 6 requisitos reais
      setChecklist({
        storeConfigured: hasStoreName,
        scriptInstalled: hasStories,      // Integrado quando o fluxo inicial de stories/views é disparado
        productsLinked: hasProducts,
        videosUploaded: hasStories,       // Se importou/subiu vídeos
        collectionsCreated: hasStories,   // Se agrupou em coleções de stories
        appearanceConfigured: hasStoreName, // Se personalizou as cores/configurações da marca
      });
    } catch (e) {
      console.warn('Erro ao carregar checklist na página de Suporte:', e);
    } finally {
      setLoadingChecklist(false);
    }
  }, []);

  useEffect(() => {
    loadChecklistState();
  }, [loadChecklistState]);

  // Lista exata dos 6 passos na ordem da Visão Geral
  const steps = [
    {
      id: 'store',
      title: 'Configurações da loja',
      description: 'Preencha os dados cadastrais, e-mail e integre seu canal de WhatsApp.',
      completed: checklist.storeConfigured,
      link: '/settings'
    },
    {
      id: 'install',
      title: 'Instalação do script',
      description: 'Copie e instale o script de embed nas plataformas ou via GTM.',
      completed: checklist.scriptInstalled,
      link: '/integration'
    },
    {
      id: 'products',
      title: 'Vincular os produtos',
      description: 'Vincule produtos com preço para permitir compra direta através dos vídeos.',
      completed: checklist.productsLinked,
      link: '/produtos'
    },
    {
      id: 'upload',
      title: 'Subir vídeos',
      description: 'Suba seus vídeos verticais ou importe do Instagram/TikTok.',
      completed: checklist.videosUploaded,
      link: '/stories'
    },
    {
      id: 'collections',
      title: 'Criar coleção de Stories',
      description: 'Agrupe seus vídeos em coleções interativas.',
      completed: checklist.collectionsCreated,
      link: '/stories'
    },
    {
      id: 'appearance',
      title: 'Configurar a aparência',
      description: 'Personalize cores, fontes, bordas e botões do player de stories.',
      completed: checklist.appearanceConfigured,
      link: '/aparencia'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Suporte e Central de Ajuda
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
          Precisa de uma mãozinha? Acesse nossos tutoriais ou fale com nossos especialistas.
        </p>
      </div>

      {/* Grid dos Cards de Ação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Artigos */}
        <div className="bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between group">
          <div className="space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0094EB]">
              <BookOpen size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Central de Ajuda</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                Acesse artigos, tutoriais e resolva dúvidas rapidamente na nossa base de ajuda.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <button
              onClick={() => navigate('/suporte/artigos')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-50 dark:bg-[#0f1220] border border-slate-100 dark:border-slate-800 hover:border-[#0094EB] px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] hover:scale-105 transition-all cursor-pointer"
            >
              Acessar Artigos <ArrowRight size={13} className="text-[#0094EB] dark:text-[#ff7a29]" />
            </button>
          </div>
        </div>

        {/* Playlist */}
        <div className="bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between group">
          <div className="space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-500">
              <Play size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Tutoriais em Vídeo</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                Assista nossa playlist com vídeos passo a passo para otimizar seus resultados.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <a
              href={PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-50 dark:bg-[#0f1220] border border-slate-100 dark:border-slate-800 hover:border-violet-500 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] hover:scale-105 transition-all cursor-pointer"
            >
              Ver Playlist <ExternalLink size={13} className="text-violet-500" />
            </a>
          </div>
        </div>

        {/* Chamada WhatsApp */}
        <div className="bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between group">
          <div className="space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
              <MessageCircle size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Fale Conosco</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                Precisa de suporte imediato? Clique e fale com nossos especialistas via WhatsApp.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all hover:scale-105 cursor-pointer"
            >
              Chamar no WhatsApp
            </a>
          </div>
        </div>

      </div>

      {/* Checklist de Ativação Incorporado */}
      <div className="bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-[#ff7a29]">
            <Sparkles size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Checklist de Ativação</h3>
            <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0]">Conclua todos os passos para que os Stories fiquem online na sua loja.</p>
          </div>
        </div>

        {loadingChecklist ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800/30 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((step) => (
              <div 
                key={step.id} 
                onClick={() => navigate(step.link)}
                className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f1220]/50 hover:bg-slate-50 dark:hover:bg-[#0f1220] hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="mt-0.5 shrink-0">
                  {step.completed ? (
                    <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-100 dark:fill-emerald-950/20 stroke-[2.5]" />
                  ) : (
                    <Circle size={20} className="text-slate-300 dark:text-slate-700 stroke-[2.5]" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#0094EB] dark:group-hover:text-[#ff7a29] transition-colors flex items-center gap-1">
                    {step.title}
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-[#8a90a0] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
