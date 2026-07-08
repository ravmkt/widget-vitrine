import React, { useEffect, useState } from 'react';
import { db, SizingModel } from '@/lib/db';
import { Ruler, Plus, User, Trash2, Edit3 } from 'lucide-react';

const MedidasPage = () => {
  const [models, setModels] = useState<SizingModel[]>([]);

  useEffect(() => {
    db.sizingModels.getAll().then(setModels);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Tabelas de Medidas</h1>
          <p className="text-[#64748B] font-medium mt-1">Configure o perfil das modelos e as especificações de tamanho.</p>
        </div>
        <button className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2">
          <Plus size={18} /> Adicionar Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(m => (
          <div key={m.id} className="bg-white border border-[#E2E8F0] rounded-[2rem] p-6 shadow-sm">
             <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0094EB]">
                   <User size={24} />
                </div>
                <div>
                   <h3 className="font-black text-[#0F172A]">{m.name}</h3>
                   <span className="text-[10px] font-bold text-[#64748B] uppercase">Perfil Ativo</span>
                </div>
             </div>
             <div className="space-y-2 mb-6">
                {m.measures.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-[#F1F5F9] text-sm">
                    <span className="text-[#64748B] font-medium">{item.name}</span>
                    <span className="text-[#0F172A] font-bold">{item.value} {item.unit}</span>
                  </div>
                ))}
             </div>
             <div className="flex gap-2">
                <button className="flex-1 bg-[#F1F5F9] text-[#0F172A] py-2 rounded-xl text-xs font-bold hover:bg-[#E2E8F0]">Editar</button>
                <button className="p-2 border border-[#E2E8F0] rounded-xl text-[#64748B] hover:text-red-500"><Trash2 size={16} /></button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedidasPage;