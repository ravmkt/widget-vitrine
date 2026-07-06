import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import WidgetPreview from '@/components/WidgetPreview';
import { db, Story, WidgetSettings } from '@/lib/db';
import { Eye, Code, Copy, Check, Sparkles, Smartphone, Laptop, RefreshCw } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const StoriesWidgetPage = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  const loadData = async () => {
    setLoading(true);
    try {
      const stores = await db.getStores();
      const mainStore = stores[0];
      if (mainStore) {
        const fetchedStories = await db.getStories(mainStore.id);
        const fetchedSettings = await db.getSettings(mainStore.id);
        setStories(fetchedStories);
        setSettings(fetchedSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do widget:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const widgetScriptCode = "<!-- Vidlytics Stories Widget -->\n<script src=\"" + window.location.origin + "/widget.js\" async></script>";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetScriptCode);
    setCopied(true);
    showSuccess('Código de incorporação copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">Carregando simulador do widget...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Visualizador do Widget</h1>
            <p className="text-slate-500 mt-1">
              Veja exatamente como os stories aparecem na sua loja virtual e teste a interatividade.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                previewMode === 'mobile'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Celular
            </button>
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                previewMode === 'desktop'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Painel de Controle Lateral */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Status do Widget</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Widget Ativo</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    settings?.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {settings?.active ? 'Sim' : 'Não'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total de Stories</span>
                  <span className="text-sm font-bold text-slate-800">
                    {stories.length} ({stories.filter(s => s.active).length} ativos)
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Cor do Tema</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-slate-200" 
                      style={{ backgroundColor: settings?.theme_color || '#8B5CF6' }}
                    />
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {settings?.theme_color || '#8B5CF6'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Código de Incorporação Rápido */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
                <Code className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Código de Integração</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Copie o script abaixo e cole no cabeçalho ou rodapé da sua loja virtual para exibir os stories automaticamente.
              </p>

              <div className="bg-slate-950 rounded-xl p-4 relative group">
                <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {widgetScriptCode}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Copiar Código"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Simulador Interativo */}
          <div className="lg:col-span-8 flex justify-center">
            {previewMode === 'mobile' ? (
              <div className="p-4 bg-slate-100 rounded-[48px] border border-slate-200 shadow-inner">
                {settings && <WidgetPreview stories={stories} settings={settings} />}
              </div>
            ) : (
              <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Mock Browser Header */}
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-lg text-xs text-slate-400 font-medium flex-1 max-w-md mx-auto text-center border border-slate-200/60">
                    https://useanny.com.br
                  </div>
                </div>

                {/* Mock Store Content Desktop */}
                <div className="p-8 bg-slate-50 min-h-[500px] relative flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                          U
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Useanny</h4>
                          <p className="text-xs text-slate-400">Sua loja de moda feminina</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm font-semibold text-slate-600">
                        <span>Início</span>
                        <span>Coleções</span>
                        <span>Contato</span>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm max-w-2xl mb-8">
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Nova Coleção de Outono 🍂</h2>
                      <p className="text-slate-500 text-sm mb-4">Aproveite frete grátis para todo o Brasil nas compras acima de R$ 199.</p>
                      <button className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-100">
                        Ver Produtos
                      </button>
                    </div>
                  </div>

                  {/* Widget embedded at the bottom of the desktop view */}
                  {settings?.active && stories.filter(s => s.active).length > 0 && (
                    <div className="border-t border-slate-200/60 pt-6">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                        Assista aos nossos Stories
                      </h3>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {stories.filter(s => s.active).map((story) => (
                          <div key={story.id} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div 
                              className="p-[3px] rounded-full transition-transform duration-300 group-hover:scale-105"
                              style={{ background: `linear-gradient(45deg, ${settings.theme_color}, #EC4899)` }}
                            >
                              <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-slate-200">
                                <img src={story.thumbnail_url} alt={story.title} className="w-full h-full object-cover" />
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 max-w-[80px] truncate text-center">
                              {story.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoriesWidgetPage;