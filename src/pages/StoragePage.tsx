import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Search,
  Trash2,
  Eye,
  FileVideo,
  FileImage,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface StorageItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  sizeInBytes: number;
  createdAt: string;
  thumbnailUrl: string;
  canDelete: boolean;
}

// Dados simulados iniciais para marcação de interface
const INITIAL_FILES: StorageItem[] = [
  {
    id: '1',
    name: 'REPLAY/1786447244576-whatsapp-video-2026-04-15.mp4',
    type: 'video',
    sizeInBytes: 9437184, // 9 MB
    createdAt: '11/08/2026',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    canDelete: true,
  },
  {
    id: '2',
    name: 'REPLAY/1786447029869-whatsapp-video-2026-04-15.mp4',
    type: 'video',
    sizeInBytes: 65011712, // 62 MB
    createdAt: '11/08/2026',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    canDelete: true,
  },
  {
    id: '3',
    name: 'BANNER_PROMO_VERAO_2026.png',
    type: 'image',
    sizeInBytes: 2621440, // 2.5 MB
    createdAt: '10/08/2026',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    canDelete: true,
  },
  {
    id: '4',
    name: 'LOOKBOOK_COLECAO_SCRUBS_PREMIUM.mp4',
    type: 'video',
    sizeInBytes: 157286400, // 150 MB
    createdAt: '08/08/2026',
    thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    canDelete: true,
  },
];

const PLAN_LIMIT_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB em bytes

export default function StoragePage() {
  const [files, setFiles] = useState<StorageItem[]>(INITIAL_FILES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'image'>('all');

  // Cálculo dinâmico do consumo de armazenamento
  const totalUsedBytes = useMemo(() => {
    return files.reduce((acc, file) => acc + file.sizeInBytes, 0);
  }, [files]);

  const usedPercentage = useMemo(() => {
    const pct = (totalUsedBytes / PLAN_LIMIT_BYTES) * 100;
    return Math.max(1, Math.min(100, Number(pct.toFixed(2))));
  }, [totalUsedBytes]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || file.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [files, searchTerm, selectedType]);

  const handleDeleteFile = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o arquivo "${name}"?`)) {
      setFiles(prev => prev.filter(f => f.id !== id));
      showSuccess('Arquivo removido com sucesso!');
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-16">
      {/* Header da Página */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Meu Armazenamento
          </h1>
          <p className="mt-1 font-medium text-slate-500 dark:text-slate-400">
            Gerencie os vídeos e imagens hospedados no seu plano.
          </p>
        </div>
        <button
          type="button"
          onClick={() => showSuccess('Selecione um arquivo para upload.')}
          className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0E4787] transition-all"
        >
          <UploadCloud size={18} />
          Fazer Upload
        </button>
      </div>

      {/* Card da Régua de Porcentagem de Armazenamento Dinâmica */}
      {(() => {
        const isCritical = usedPercentage >= 95;
        const isWarning = usedPercentage >= 70 && usedPercentage < 95;

        const progressColorClass = isCritical
          ? 'bg-[#E11D48]'
          : isWarning
            ? 'bg-amber-500'
            : 'bg-emerald-500';

        const textColorClass = isCritical
          ? 'text-[#E11D48]'
          : isWarning
            ? 'text-amber-500'
            : 'text-emerald-500';

        return (
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                    isCritical
                      ? 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/40'
                      : isWarning
                        ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40'
                        : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40'
                  )}
                >
                  <HardDrive size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Plano Pro
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      100 GB Limite
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Uso atual: <strong className="text-slate-800 dark:text-slate-200">{formatSize(totalUsedBytes)}</strong> de 100 GB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                {(isWarning || isCritical) && (
                  <button
                    type="button"
                    onClick={() => showSuccess('Redirecionando para a página de planos...')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-md transition-all',
                      isCritical
                        ? 'bg-[#E11D48] hover:bg-rose-700 shadow-rose-500/20'
                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    )}
                  >
                    <Sparkles size={14} />
                    Faça Upgrade
                  </button>
                )}

                <div>
                  <span className={cn('text-2xl font-black', textColorClass)}>
                    {usedPercentage}%
                  </span>
                  <span className="block text-[11px] font-bold text-slate-400">Espaço Consumido</span>
                </div>
              </div>
            </div>

            {/* Alerta textual no modo Warning ou Critical */}
            {(isWarning || isCritical) && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl p-3 text-xs font-bold',
                  isCritical
                    ? 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/30'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                )}
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  {isCritical
                    ? 'Atenção: Seu armazenamento está quase cheio! Faça upgrade agora para não interromper a exibição das mídias.'
                    : 'Seu limite de armazenamento está se aproximando do fim. Considere fazer upgrade do seu plano.'}
                </span>
              </div>
            )}

            {/* Barra de Progresso com Cor Dinâmica */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn('h-full rounded-full transition-all duration-500', progressColorClass)}
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Tabela de Arquivos no Padrão Vidlytics */}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        
        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar pelo nome do arquivo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={cn(
                "rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                selectedType === 'all'
                  ? "bg-[#0094EB] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('video')}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                selectedType === 'video'
                  ? "bg-[#0094EB] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              <FileVideo size={14} />
              Vídeos
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('image')}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                selectedType === 'image'
                  ? "bg-[#0094EB] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              <FileImage size={14} />
              Imagens
            </button>
          </div>
        </div>

        {/* Tabela de Mídias */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Mídia</th>
                <th className="px-6 py-4">Nome do Arquivo</th>
                <th className="px-6 py-4 text-center">Criado em</th>
                <th className="px-6 py-4 text-center">Tamanho</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    Nenhum arquivo encontrado.
                  </td>
                </tr>
              ) : (
                filteredFiles.map(file => (
                  <tr key={file.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-3.5">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800">
                        <img src={file.thumbnailUrl} alt={file.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                          {file.type === 'video' ? <FileVideo size={16} /> : <FileImage size={16} />}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 max-w-xs truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#0094EB] uppercase">
                        {file.type === 'video' ? 'Vídeo MP4' : 'Imagem'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-center font-mono text-xs font-bold text-slate-500">
                      {file.createdAt}
                    </td>

                    <td className="px-6 py-3.5 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatSize(file.sizeInBytes)}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        Disponível
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(file.thumbnailUrl, '_blank')}
                          className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#0094EB] dark:hover:bg-blue-950"
                          title="Visualizar mídia"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                          title="Excluir arquivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
