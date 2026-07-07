import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, GeneralSettings, Appearance, Store } from '@/lib/db';
import { Save, Code, Copy, Check, Palette, Phone, Globe, Settings as SettingsIcon, Brush } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const SettingsPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        setStore(mainStore);

        if (mainStore) {
          const fetchedGeneralSettings = (await db.generalSettings.getAll(mainStore.id))[0];
          setGeneralSettings(fetchedGeneralSettings);

          const fetchedAppearances = await db.appearances.getAll(mainStore.id);
          setAppearances(fetchedAppearances);
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
    if (!generalSettings) return;

    try {
      await db.generalSettings.save(generalSettings);
      showSuccess('Configurações salvas com sucesso!');
    } catch (error) {
      showError('Erro ao salvar configurações.');
    }
  };

  const widgetScriptCode = "<!-- Vidlytics Stories Widget -->\n<script src=\"" + window.location.origin + "/widget.js\" async></script>";

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
                <SettingsIcon className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Configurações Gerais</h3>
              </div>

              {generalSettings && (
                <div className="space-y-6">
                  {/* Nome da Loja */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Nome da Loja
                    </label>
                    <input
                      type="text"
                      value={generalSettings.store_name}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, store_name: e.target.value })}
                      placeholder="Nome da sua loja"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  </div>

                  {/* URL da Loja */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      URL da Loja
                    </label>
                    <input
                      type="url"
                      value={generalSettings.store_url}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, store_url: e.target.value })}
                      placeholder="https://sua-loja.com.br"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  </div>

                  {/* Número de WhatsApp da Loja */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-violet-600" />
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        WhatsApp da Loja
                      </label>
                    </div>
                    <input
                      type="tel"
                      value={generalSettings.whatsapp_number || ''}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp_number: e.target.value })}
                      placeholder="Ex: 5541999999999"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Este número será usado para o botão de WhatsApp em todos os stories. Inclua o código do país (ex: 55 para Brasil).
                    </p>
                  </div>

                  {/* Mensagem Padrão WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Mensagem Padrão WhatsApp
                    </label>
                    <textarea
                      value={generalSettings.whatsapp_default_message || ''}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp_default_message: e.target.value })}
                      placeholder="Olá! Tenho interesse nos produtos da loja."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800 resize-y"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Mensagem pré-preenchida ao iniciar uma conversa via WhatsApp.
                    </p>
                  </div>

                  {/* Aparência Padrão */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Brush className="w-4 h-4 text-violet-600" />
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Aparência Padrão do Widget
                      </label>
                    </div>
                    <select
                      value={generalSettings.default_appearance_id || ''}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, default_appearance_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    >
                      <option value="">Nenhuma</option>
                      {appearances.map(app => (
                        <option key={app.id} value={app.id}>{app.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Selecione a aparência padrão para novos stories e widgets.
                    </p>
                  </div>

                  {/* Ativar/Desativar App */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-800">Status Geral do App</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ative ou desative todas as funcionalidades do Vidlytics Stories na sua loja.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeneralSettings({ ...generalSettings, app_enabled: !generalSettings.app_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        generalSettings.app_enabled ? 'bg-violet-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          generalSettings.app_enabled ? 'translate-x-6' : 'translate-x-1'
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
                Este script também é compatível com o Google Tag Manager (GTM).
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
                  <li>
                    Vá em <strong>Configurações</strong> {" > "} <strong>Scripts</strong>
                  </li>
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