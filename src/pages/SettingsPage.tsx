import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, GeneralSettings, Appearance, Store } from '@/lib/db';
import {
  Save,
  Globe,
  Settings as SettingsIcon,
  Brush,
  Phone,
  Store as StoreIcon,
  Shield,
  Eye,
  Copy,
  Check,
  Languages,
  Clock,
  ExternalLink,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const SettingsPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UX triggers
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        setStore(mainStore);

        if (mainStore) {
          const fetchedGeneralSettings = (await db.generalSettings.getAll(mainStore.id))[0];
          setGeneralSettings(fetchedGeneralSettings || null);

          const fetchedAppearances = await db.appearances.getAll(mainStore.id);
          setAppearances(fetchedAppearances);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showError('Erro ao carregar os parâmetros de configurações.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalSettings) return;

    try {
      await db.generalSettings.save(generalSettings);
      showSuccess('Configurações atualizadas com sucesso!');
    } catch (error) {
      showError('Erro ao salvar as configurações.');
    }
  };

  const handleRegenerateKey = () => {
    if (!generalSettings) return;
    setIsRegenerating(true);
    setTimeout(() => {
      const chars = 'abcdef0123456789';
      let randomHex = '';
      for (let i = 0; i < 32; i++) {
        randomHex += chars[Math.floor(Math.random() * chars.length)];
      }
      const newKey = `pub_live_${randomHex}`;
      setGeneralSettings({ ...generalSettings, public_installation_key: newKey });
      setIsRegenerating(false);
      showSuccess('Chave pública de instalação regenerada com sucesso!');
    }, 800);
  };

  const handleCopyKey = () => {
    if (generalSettings?.public_installation_key) {
      navigator.clipboard.writeText(generalSettings.public_installation_key);
      setCopiedKey(true);
      showSuccess('Chave pública copiada!');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-sm text-slate-400 font-semibold">Carregando painel de parametrização...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Configurações do Sistema
          </h1>
          <p className="text-slate-400 mt-1">
            Configure dados da loja, ativação de módulos, canais de WhatsApp, comportamento dos vídeos e chaves de criptografia.
          </p>
        </div>

        {generalSettings && (
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* 1. DADOS DA LOJA */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <StoreIcon className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold text-slate-100">1. Dados da Loja</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Nome da Loja */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome da Loja *
                  </label>
                  <input
                    type="text"
                    required
                    value={generalSettings.store_name}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, store_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-semibold text-slate-200"
                    placeholder="Minha Loja Virtual"
                  />
                </div>

                {/* URL da Loja */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL da Loja *
                  </label>
                  <input
                    type="url"
                    required
                    value={generalSettings.store_url}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, store_url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-mono text-slate-200"
                    placeholder="https://minhaloja.com.br"
                  />
                </div>

                {/* Logo da Loja */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL do Logo da Loja
                  </label>
                  <input
                    type="url"
                    value={generalSettings.logo_url || ''}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, logo_url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-mono text-slate-200"
                    placeholder="https://minhaloja.com.br/logo.png"
                  />
                </div>

                {/* Email de Contato */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={generalSettings.contact_email || ''}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, contact_email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-semibold text-slate-200"
                    placeholder="sac@minhaloja.com.br"
                  />
                </div>

              </div>
            </div>

            {/* 2. CONFIGURAÇÕES DO APP */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <SettingsIcon className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-lg font-bold text-slate-100">2. Configurações do App</h3>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Ativar/Desativar Geral */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Ativar Geral do App</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Controla a renderização completa.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, app_enabled: !generalSettings.app_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.app_enabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.app_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Ativar/Desativar Stories */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Ativar Módulo Stories</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Disponibiliza exibição de stories.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, stories_enabled: !generalSettings.stories_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.stories_enabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.stories_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Ativar/Desativar Carrossel */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Ativar Carrossel</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Permite rolagem horizontal.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, carousel_enabled: !generalSettings.carousel_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.carousel_enabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.carousel_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Ativar/Desativar Widget Flutuante */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Ativar Widget Flutuante</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Exibe círculo fixo no canto.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, floating_widget_enabled: !generalSettings.floating_widget_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.floating_widget_enabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.floating_widget_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

              </div>

              {/* Template e Idioma */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
                
                {/* Template Padrão */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brush className="w-3.5 h-3.5 text-slate-500" />
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Template Padrão</label>
                  </div>
                  <select
                    value={generalSettings.default_appearance_id || ''}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, default_appearance_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                  >
                    <option value="">Nenhum template selecionado</option>
                    {appearances.map(app => (
                      <option key={app.id} value={app.id}>{app.name}</option>
                    ))}
                  </select>
                </div>

                {/* Idioma */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Languages className="w-3.5 h-3.5 text-slate-500" />
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Idioma</label>
                  </div>
                  <select
                    value={generalSettings.language}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                  >
                    <option value="pt-BR">Português (pt-BR)</option>
                    <option value="en-US">Inglês (en-US)</option>
                    <option value="es-ES">Espanhol (es-ES)</option>
                  </select>
                </div>

                {/* Fuso Horário */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Fuso Horário</label>
                  </div>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                  >
                    <option value="America/Sao_Paulo">Brasília (America/Sao_Paulo)</option>
                    <option value="America/Manaus">Manaus (America/Manaus)</option>
                    <option value="UTC">UTC (Universal Time)</option>
                  </select>
                </div>

              </div>
            </div>

            {/* 3. CONFIGURAÇÕES WHATSAPP */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Phone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">3. Integração WhatsApp</h3>
              </div>

              <div className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* WhatsApp da Loja */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Número do WhatsApp da Loja
                    </label>
                    <input
                      type="text"
                      value={generalSettings.whatsapp_number || ''}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp_number: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-semibold text-slate-200"
                      placeholder="Ex: 5545999629702"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">Insira o número completo com DDD e código do país (ex: 55 para Brasil).</p>
                  </div>

                  {/* WhatsApp Button Switch */}
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl h-fit self-end">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200 font-semibold">Botão WhatsApp nos Vídeos</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Mostra atalho direto para falar no WhatsApp.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeneralSettings({ ...generalSettings, whatsapp_button_enabled: !generalSettings.whatsapp_button_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        generalSettings.whatsapp_button_enabled ? 'bg-emerald-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        generalSettings.whatsapp_button_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Mensagem Padrão */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Mensagem Padrão de Contato
                  </label>
                  <textarea
                    rows={2}
                    value={generalSettings.whatsapp_default_message || ''}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp_default_message: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-200 leading-relaxed placeholder-slate-600 font-semibold"
                    placeholder="Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    💡 Dica: Use a tag <code className="bg-slate-950 text-emerald-400 border border-slate-850 px-1 py-0.5 rounded font-mono text-[9px] font-bold">{"{{story_title}}"}</code> para que o sistema injete automaticamente o título do vídeo onde o cliente clicou.
                  </p>
                </div>

              </div>
            </div>

            {/* 4. COMPORTAMENTO */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Laptop className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-slate-100">4. Comportamento e Player</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Target da aba do produto */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Abrir Produto em Nova Aba</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Mantém o usuário na loja ao clicar no produto.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, open_product_new_tab: !generalSettings.open_product_new_tab })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.open_product_new_tab ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.open_product_new_tab ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Pausar vídeo ao sair da tela */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Pausar Vídeo ao Sair</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Pausa reprodução se o usuário scrollar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, pause_on_invisible: !generalSettings.pause_on_invisible })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.pause_on_invisible ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.pause_on_invisible ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Reproduzir automaticamente */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Reproduzir Automaticamente</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dá play no story logo ao carregar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, autoplay: !generalSettings.autoplay })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.autoplay ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.autoplay ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Silenciar vídeo por padrão */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Silenciar por Padrão</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Vídeos iniciam mudos para evitar bloqueio.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, muted_by_default: !generalSettings.muted_by_default })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.muted_by_default ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.muted_by_default ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Mostrar controles de video */}
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl sm:col-span-2">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">Mostrar Controles do Vídeo</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Exibe botões nativos de pausa, progresso e volume do player.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralSettings({ ...generalSettings, show_video_controls: !generalSettings.show_video_controls })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      generalSettings.show_video_controls ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generalSettings.show_video_controls ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

              </div>
            </div>

            {/* 5. SEGURANÇA E IDENTIFICAÇÃO */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">5. Segurança e Identificação</h3>
              </div>

              <div className="space-y-5">
                
                {/* ID da Loja */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID de Loja Primário</span>
                    <span className="text-sm font-mono text-slate-300 select-all font-semibold block mt-1">{store?.id || 'Sem identificador'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (store?.id) {
                        navigator.clipboard.writeText(store.id);
                        showSuccess('ID da loja copiado com sucesso!');
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar ID
                  </button>
                </div>

                {/* Chave pública de instalação */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl space-y-3.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chave Pública de Instalação (Public Live Key)</span>
                      <span className="text-xs font-mono text-emerald-400 select-all font-semibold block mt-1">{generalSettings.public_installation_key || 'pub_live_empty_key'}</span>
                    </div>

                    <div className="flex gap-2">
                      {/* Copy code button */}
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="inline-flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-all"
                      >
                        {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copiar Chave
                      </button>

                      {/* Regenerate code button */}
                      <button
                        type="button"
                        onClick={handleRegenerateKey}
                        disabled={isRegenerating}
                        className="inline-flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-red-950/20 text-rose-400 text-xs px-3 py-1.5 rounded-lg transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-rose-500' : ''}`} />
                        Regenerar
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed font-medium">
                    <Lock className="w-4 h-4 shrink-0 text-slate-600 mt-0.5" />
                    <span>Esta chave autentica a renderização pública do widget Yampi/Shopify sem dar acesso aos dados de faturamento ou senhas da loja. Caso suspeite de vazamento, basta clicar em **Regenerar**.</span>
                  </div>
                </div>

              </div>
            </div>

            {/* BOTÃO SALVAR CONFIGURAÇÕES */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-violet-600/10 transition-all transform hover:scale-[1.01]"
              >
                <Save className="w-4 h-4" />
                Salvar Configurações
              </button>
            </div>

          </form>
        )}

      </main>
    </div>
  );
};

export default SettingsPage;