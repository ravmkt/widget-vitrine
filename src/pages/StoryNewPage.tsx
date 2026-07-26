"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, resolveStoreId } from '@/lib/db';
import { ArrowLeft, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const StoryNewPage = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<'floating_widget' | 'carousel' | 'grid'>('floating_widget');
  const [selector, setSelector] = useState('body');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Informe um nome para o Story.');
      return;
    }

    setSaving(true);
    try {
      const storeId = await resolveStoreId();

      const story = await db.stories.save({
        title: title.trim(),
        format,
        store_id: storeId,
        active: true,
        position: Date.now(),
      });

      // Salva local de exibição
      await db.displayLocations.save({
        story_id: story.id,
        selector,
        store_id: storeId,
      });

      showSuccess('Story criado com sucesso!');
      navigate('/stories');
    } catch (e) {
      console.error('Erro ao criar story:', e);
      showError('Erro ao criar o Story.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/stories')}
          className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Novo Story
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure um novo agrupamento de vídeos.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm space-y-6 max-w-2xl">
        {/* Nome */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
            Nome do Story
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Stories da Página Inicial"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
        </div>

        {/* Formato */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
            Formato de Exibição
          </label>
          <div className="flex gap-3">
            {[
              { value: 'floating_widget', label: 'Flutuante' },
              { value: 'carousel', label: 'Carrossel' },
              { value: 'grid', label: 'Grade' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormat(opt.value as any)}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-all border ${
                  format === opt.value
                    ? 'bg-[#0094EB] text-white border-[#0094EB]'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Seletor CSS */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
            Local de Exibição (seletor CSS)
          </label>
          <input
            type="text"
            value={selector}
            onChange={e => setSelector(e.target.value)}
            placeholder="body"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
          <p className="text-xs text-slate-400 mt-1">
            Use <code className="bg-slate-100 px-1 rounded">body</code> para exibir em todas as páginas.
          </p>
        </div>

        {/* Botão salvar */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Story'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryNewPage;
