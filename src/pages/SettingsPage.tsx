import React, { useEffect, useState } from 'react';
import { db, GeneralSettings, Appearance, Store } from '@/lib/db';
import {
  Save,
  Settings as SettingsIcon,
  Brush,
  Phone,
  Store as StoreIcon,
  Shield,
  Copy,
  Check,
  Languages,
  Clock,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Lock,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const SettingsPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      showError('Erro ao salvar as configurações.');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && generalSettings) {
      if (file.size > 2 * 1024 * 1024) {
        showError('A imagem do logo deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGeneralSettings({ ...generalSettings, logo_url: reader.result as string });
        showSuccess('Logo carregado com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    if (generalSettings) {
      setGeneralSettings({ ...generalSettings, logo_url: '' });
      showSuccess('Logo removido!');
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
      showSuccess('Chave regenerada com sucesso!');
    }, 800);
  };

  const handleCopyKey = () => {
    if (generalSettings?.public_installation_key) {
      navigator.clipboard.writeText(generalSettings.public_installation_key);
      setCopiedKey(true);
      showSuccess('Chave copiada!');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 font-medium mt-1">
          Configure dados da loja, ativação de módulos e canais de suporte.
        </p>
      </div>

      {generalSettings && (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
          
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <StoreIcon className="w-5 h-5 text-[#0094EB]" />
              <h3 className="text-lg font-extrabold text-slate-800">Dados da Loja</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Loja</label>
                <input
                  type="text"
                  required
                  value={generalSettings.store_name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, store_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#0094EB] focus:ring-2 focus:ring-[#0094EB]/10 rounded-xl text-sm font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">URL da Loja</label>
                <input
                  type="url"
                  required
                  value={generalSettings.store_url}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, store_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#0094EB] focus:ring-2 focus:ring-[#0094EB]/10 rounded-xl text-sm font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Logo da Loja</label>
                <div className="flex flex-col sm:flex-row gap-6 items-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                    {generalSettings.logo_url ? (
                      <img src={generalSettings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-[#0094EB] hover:bg-[#0E4787] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2">
                      <Upload size={16} /> Enviar Imagem
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {generalSettings.logo_url && (
                      <button type="button" onClick={handleRemoveLogo} className="bg-white border border-slate-200 text-red-500 hover:bg-red-50 text-xs font-bold px-5 py-2.5 rounded-xl transition-all">
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <Phone className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-extrabold text-slate-800">Suporte e WhatsApp</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp de Suporte</label>
                <input
                  type="text"
                  value={generalSettings.whatsapp_number || ''}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#0094EB] focus:ring-2 focus:ring-[#0094EB]/10 rounded-xl text-sm font-bold text-slate-700"
                  placeholder="5500000000000"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem Padrão</label>
                <input
                  type="text"
                  value={generalSettings.whatsapp_default_message || ''}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp_default_message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#0094EB] focus:ring-2 focus:ring-[#0094EB]/10 rounded-xl text-sm font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <Shield className="w-5 h-5 text-[#0094EB]" />
              <h3 className="text-lg font-extrabold text-slate-800">Segurança e Integração</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave Pública de Instalação</span>
                <p className="text-sm font-mono text-slate-600 mt-1">{generalSettings.public_installation_key}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleCopyKey} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#0094EB] transition-all">
                  {copiedKey ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </button>
                <button type="button" onClick={handleRegenerateKey} disabled={isRegenerating} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-amber-500 transition-all">
                  <RefreshCw size={18} className={isRegenerating ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
              <Save size={18} /> Salvar Alterações
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsPage;