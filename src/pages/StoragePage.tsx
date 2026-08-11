import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// Utilitário para extrair o primeiro frame de um arquivo de vídeo via Canvas HTML5
const generateVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.1; // Avança 0.1s para evitar tela preta inicial
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(video.src);
              if (blob) resolve(blob);
              else reject(new Error('Falha ao gerar blob do canvas'));
            },
            'image/jpeg',
            0.85
          );
        } else {
          URL.revokeObjectURL(video.src);
          reject(new Error('Não foi possível obter contexto do canvas'));
        }
      } catch (err) {
        URL.revokeObjectURL(video.src);
        reject(err);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(video.src);
      reject(err);
    };
  });
};

import {
  HardDrive,
  Search,
  Trash2,
  Eye,
  Download,
  Pencil,
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
  fileUrl: string;
  productName?: string;
  storyTitle?: string;
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

const PLAN_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB em bytes para testes de régua

export default function StoragePage() {
  const [files, setFiles] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'image'>('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gatilho para abrir a janela do sistema operacional ao clicar no botão "Fazer Upload"
  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Processa o arquivo selecionado na janela
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      showSuccess(`Iniciando processamento de "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

      const settings = await db.getSettings();
      if (!settings?.store_id) {
        throw new Error('ID da loja não encontrado nas configurações.');
      }

      const isVideo = file.type.startsWith('video');
      const tempUrl = URL.createObjectURL(file);
      let thumbnailUrl = tempUrl;
      let thumbnailSize = 0;

      // Se for vídeo, gera automaticamente a capa a partir do primeiro frame (0.1s)
      if (isVideo) {
        try {
          const thumbBlob = await generateVideoThumbnail(file);
          thumbnailSize = thumbBlob.size;
          // Em um ambiente de produção com bucket Supabase, este blob é enviado via upload
          // e retorna a URL permanente pública do Supabase Storage
          thumbnailUrl = URL.createObjectURL(thumbBlob);
        } catch (thumbErr) {
          console.warn('Não foi possível gerar thumbnail do vídeo, usando fallback:', thumbErr);
        }
      }

      const payload = {
        store_id: settings.store_id,
        title: file.name,
        video_source_type: isVideo ? 'upload' : 'url',
        source_type: isVideo ? 'upload' : 'url',
        video_url: tempUrl,
        thumbnail_url: thumbnailUrl,
        thumbnail_source_type: isVideo ? 'auto' : 'url',
        file_size: file.size,
        thumbnail_file_size: thumbnailSize,
        status: 'active',
        active: true,
        created_at: new Date().toISOString(),
      };

      // Tenta salvar usando o cliente Supabase direto para evitar exceções de wrapper
      if (supabase) {
        const { error } = await supabase.from('videos').insert([payload]);
        if (error) throw error;
      } else if (typeof db.videos?.create === 'function') {
        await db.videos.create(payload);
      } else if (typeof db.videos?.insert === 'function') {
        await db.videos.insert(payload);
      } else {
        throw new Error('Nenhum método de gravação válido encontrado em db.videos');
      }

      showSuccess('Mídia adicionada com sucesso!');
      await loadAccountStorageData();
    } catch (err) {
      console.error('Erro ao realizar upload:', err);
      showError('Falha ao salvar o arquivo enviado.');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Função de Download Forçado via Blob (Impede que apenas abra nova aba)
  const handleDownloadFile = async (url: string, fileName: string) => {
    if (!url) {
      showError('URL do arquivo indisponível para download.');
      return;
    }

    try {
      showSuccess(`Preparando download de "${fileName}"...`);

      // Se for uma Blob URL local ou data URL
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Faz o fetch do arquivo para forçar o download direto em bytes
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Erro ao baixar arquivo por Blob, executando fallback:', err);
      // Fallback em caso de restrição estrita de CORS
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Carrega vídeos e imagens cadastrados na conta real do usuário
  const loadAccountStorageData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedItems: StorageItem[] = [];

      // 1. Buscar vídeos da conta no banco lendo a nova coluna file_size
      const realVideos = await db.videos.getAll();
      if (Array.isArray(realVideos)) {
        realVideos.forEach((vid: any) => {
          // Identifica se a mídia é um link externo (Instagram, TikTok, URL externa)
          const videoUrlStr = String(vid.video_url || '').toLowerCase();
          const isExplicitUrlType = vid.video_source_type === 'url' || vid.source_type === 'url';
          
          // Se não for uma blob local e não estiver hospedado no bucket oficial do Supabase da plataforma, é externa
          const isHostedOnPlatform = videoUrlStr.startsWith('blob:') || videoUrlStr.includes('supabase');
          
          const isExternalUrl = isExplicitUrlType || (!isHostedOnPlatform && videoUrlStr.startsWith('http'));

          // Se for URL externa, o peso ocupado no servidor da plataforma é 0 B
          const actualBytes = isExternalUrl 
            ? 0 
            : (vid.file_size && Number(vid.file_size) > 0 
                ? Number(vid.file_size) 
                : 20971520); // Fallback de 20MB apenas para arquivos de UPLOAD antigos

          const formattedDate = vid.created_at 
            ? new Date(vid.created_at).toLocaleDateString('pt-BR') 
            : 'Hoje';

          const mediaUrl = vid.video_url || vid.thumbnail_url || '';

          loadedItems.push({
            id: vid.id || String(Math.random()),
            name: vid.title || `VIDEO_${vid.id?.slice(0, 6) || 'UPLOAD'}.mp4`,
            type: 'video',
            sizeInBytes: actualBytes,
            createdAt: formattedDate,
            thumbnailUrl: vid.thumbnail_url || vid.video_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            fileUrl: mediaUrl,
            canDelete: true,
          });
        });
      }

      // 2. Buscar logotipo das configurações da loja
      const settings = await db.getSettings();
      if (settings?.logo_url) {
        const logoBytes = settings.logo_file_size && Number(settings.logo_file_size) > 0
          ? Number(settings.logo_file_size)
          : 1572864; // Fallback ~1.5 MB

        loadedItems.push({
          id: 'logo-setting-file',
          name: 'LOGOTIPO_OFICIAL_LOJA.png',
          type: 'image',
          sizeInBytes: logoBytes,
          createdAt: 'Ativo',
          thumbnailUrl: settings.logo_url,
          fileUrl: settings.logo_url,
          canDelete: false,
        });
      }

      setFiles(loadedItems);
    } catch (err) {
      console.error('Erro ao carregar arquivos da conta:', err);
      showError('Erro ao carregar dados de armazenamento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccountStorageData();
  }, [loadAccountStorageData]);

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

  const handleDeleteFile = async (id: string, name: string) => {
    if (id === 'logo-setting-file') {
      showError('O logotipo da loja não pode ser excluído por este painel.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o arquivo "${name}"?`)) {
      try {
        if (supabase) {
          const { error } = await supabase.from('videos').delete().eq('id', id);
          if (error) throw error;
        } else if (typeof db.videos?.delete === 'function') {
          await db.videos.delete(id);
        }

        showSuccess('Arquivo removido com sucesso!');
        await loadAccountStorageData();
      } catch (err) {
        console.error('Erro ao excluir arquivo:', err);
        showError('Não foi possível excluir o arquivo no banco de dados.');
      }
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
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*,image/*"
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={handleTriggerUpload}
            className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0E4787] transition-all disabled:opacity-50"
          >
            <UploadCloud size={18} className={uploading ? 'animate-bounce' : ''} />
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </button>
        </div>

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
                      {formatSize(PLAN_LIMIT_BYTES)} Limite
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Uso atual: <strong className="text-slate-800 dark:text-slate-200">{formatSize(totalUsedBytes)}</strong> de {formatSize(PLAN_LIMIT_BYTES)}
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
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Story Vinculado</th>
                <th className="px-6 py-4 text-center">Tamanho</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    Carregando mídias da sua conta...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    Nenhum arquivo encontrado no seu armazenamento.
                  </td>
                </tr>
              ) : (
                filteredFiles.map(file => (
                  <tr key={file.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-3.5">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm dark:border-slate-800 flex items-center justify-center shrink-0">
                        {file.type === 'video' ? (
                          file.thumbnailUrl && !file.thumbnailUrl.includes('unsplash.com') ? (
                            <img src={file.thumbnailUrl} alt={file.name} className="h-full w-full object-cover" />
                          ) : (
                            <video
                              src={`${file.fileUrl || file.thumbnailUrl}#t=0.1`}
                              className="h-full w-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          )
                        ) : (
                          <img src={file.thumbnailUrl} alt={file.name} className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white pointer-events-none">
                          {file.type === 'video' ? <FileVideo size={16} /> : <FileImage size={16} />}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 max-w-xs truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#0094EB] uppercase">
                        {file.sizeInBytes === 0 && file.type === 'video' 
                          ? 'Vídeo (URL Externa)' 
                          : file.type === 'video' 
                            ? 'Vídeo MP4 (Hospedado)' 
                            : 'Imagem'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {file.productName || 'Sem produto'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      {file.storyTitle ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-extrabold text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                          {file.storyTitle}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">—</span>
                      )}
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
                        {file.type === 'video' && (
                          <button
                            type="button"
                            onClick={() => window.location.href = `/videos/${file.id}/edit`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950"
                            title="Editar vínculos e dados do vídeo"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.open(file.fileUrl || file.thumbnailUrl, '_blank')}
                          className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#0094EB] dark:hover:bg-blue-950"
                          title="Visualizar mídia"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file.fileUrl || file.thumbnailUrl, file.name)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950"
                          title="Baixar arquivo"
                        >
                          <Download size={16} />
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
