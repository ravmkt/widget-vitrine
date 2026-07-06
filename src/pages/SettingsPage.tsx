import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, WidgetSettings, Store } from '@/lib/db';
import { Save, Code, Copy, Check, Palette } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const SettingsPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stores = await db.getStores();
        const mainStore = stores[0];
        setStore(mainStore);

        if (mainStore) {
          const fetchedSettings = await db.getSettings(mainStore.id);
          setSettings(fetchedSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await db.saveSettings(settings);
      showSuccess('Configurações salvas com sucesso!');
    } catch (error) {
      showError('Erro ao salvar configurações.');
    }
  };

  const widgetScriptCode = `<!-- Vidlytics Stories Widget -->
<script src="${window.location.origin}/widget.js" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetScriptCode);
    setCopied(true);
    showSuccess('Código copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Configurações do Widget</h1>
          <p className="text-slate-500 mt-1">
            Personalize a aparência e o comportamento do widget de stories na sua loja virtual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Configurações */}
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Palette className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Aparência Visual</h3>
              </div>

              {settings && (
                <div className="space-y-6">
                  {/* Cor do Tema */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Cor Principal do Widget
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.theme_color}
                        onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                        className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        value={settings.theme_color}
                        onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Esta cor será usada nas bordas dos stories e nos botões de ação do player.
                    </p>
                  </div>

                  {/* Posição do Widget */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Posição na Tela (Mobile & Desktop)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { value: 'bottom-center', label: 'Inferior Centro' },
                        { value: 'bottom-right', label: 'Inferior Direita' },
                        { value: 'bottom-left', label: 'Inferior Esquerda' },
                        { value: 'top-right', label: 'Superior Direita' },
                        { value: 'top-left', label: 'Superior Esquerda' },
                      ].map((pos) => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setSettings({ ...settings, position: pos.value as any })}
                          className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            settings.position === pos.value
                              ? 'border-violet-600 bg-violet-50 text-violet-600 shadow-sm'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modo de Exibição */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Modo de Exibição
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'carousel', label: 'Carrossel Horizontal' },
                        { value: 'bubbles', label: 'Bolhas Flutuantes' },
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setSettings({ ...settings, display_mode: mode.value as any })}
                          className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            settings.display_mode === mode.value
                              ? 'border-violet-600 bg-violet-50 text-violet-600 shadow-sm'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ativar/Desativar Widget */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-800">Status do Widget</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ative ou desative a exibição do widget na sua loja virtual instantaneamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, active: !settings.active })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        settings.active ? 'bg-violet-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </button>
              </div>
            </form>
          </div>

          {/* Código de Instalação */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
                <Code className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Instalação na Yampi</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Para instalar o widget de stories na sua loja virtual Useanny hospedada na Yampi, copie o código abaixo e cole-o na seção de scripts personalizados do seu painel Yampi.
              </p>

              <div className="bg-slate-950 rounded-xl p-4 relative group">
                <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
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

              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passo a Passo:</h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2">
                  <li>Acesse o painel da sua loja na <strong>Yampi</strong>.</li>
                  <li>Vá em <strong>Configurações</strong> > <strong>Scripts</strong>.</li>
                  <li>Clique em <strong>Adicionar Script</strong>.</li>
                  <li>Cole o código acima no campo de script do <strong>Cabeçalho (Head)</strong> ou <strong>Rodapé (Body)</strong>.</li>
                  <li>Salve as alterações e pronto! O widget identificará automaticamente o domínio da sua loja.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;