import React, { useEffect, useState } from 'react';
import { db, GeneralSettings, Store } from '@/lib/db';
import { Save, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';

const SettingsPage = () => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stores = await db.stores.getAll();
      const s = (await db.generalSettings.getAll(stores[0].id))[0];
      setGeneralSettings(s || null);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalSettings || isSaving) return;
    try {
      setIsSaving(true);
      await db.generalSettings.save(generalSettings);
      setShowSuccess(true);
    } catch (error) {
      showError('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
      {generalSettings && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6">
          <input type="text" value={generalSettings.store_name} onChange={e => setGeneralSettings({...generalSettings, store_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
          <button type="submit" disabled={isSaving} className="bg-[#0094EB] text-white px-8 py-3 rounded-xl font-black flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Salvar Alterações
          </button>
        </form>
      )}
      <SuccessDialog isOpen={showSuccess} description="Configurações atualizadas." onClose={() => setShowSuccess(false)} />
    </div>
  );
};

export default SettingsPage;