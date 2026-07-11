"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video, Product } from '@/lib/db';
import {
  Plus,
  Search,
  Play,
  Trash2,
  Edit3,
  Eye,
  Film,
  MessageCircle,
  TrendingUp,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import { subDays, eachDayOfInterval } from 'date-fns';

const VideoGalleryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'instagram' | 'tiktok' | 'external_url'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string | null>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    videoId: string; 
    videoTitle: string; 
    usedInStories: boolean 
  }>({
    isOpen: false,
    videoId: '',
    videoTitle: '',
    usedInStories: false
  });

  const calculateVideoMetrics = (videoId: string) => {
    const end = new Date();
    const start = subDays(end, 30);
    const seed = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const daysInterval = eachDayOfInterval({ start, end });

    let views = 0;
    let likes = 0;
    let comments = 0;

    daysInterval.forEach(date => {
      const dateSeed = date.getDate() + date.getMonth() * 31 + (date.getFullYear() % 100) * 400;
      const combinedSeed = (seed + dateSeed) % 1000;
      const dailyViews = 15 + (combinedSeed % 40);
      const dailyLikes = Math.floor(dailyViews * (0.10 + (combinedSeed % 15) / 100));
      const dailyComments = Math.floor(dailyLikes * (0.05 + (combinedSeed % 5) / 100));
      views += dailyViews;
      likes += dailyLikes;
      comments += dailyComments;
    });

    return { views, likes, comments };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allVideos, allProducts] = await Promise.all([
          db.videos.getAll(),
          db.products.getAll()
        ]);
        setVideos(allVideos);
        setProducts(allProducts);
      } catch (e) {
        showError('Erro ao carregar vídeos.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getVideoMetrics = (video: Video) => {
    const base = calculateVideoMetrics(video.id);
    const views = Number((video as any).views_count ?? (video as any).view_count ?? (video as any).views ?? base.views ?? 0);
    const comments = Number((video as any).comments_count ?? (video as any).comment_count ?? (video as any).comments ?? base.comments ?? 0);
    const likes = Number((video as any).likes_count ?? (video as any).like_count ?? (video as any).likes ?? base.likes ?? 0);
    const clicks = Number((video as any).clicks_count ?? (video as any).click_count ?? (video as any).clicks ?? 0);
    const ctrValue = (video as any).ctr ?? (views > 0 ? (clicks / views) * 100 : 0);
    return { views, comments, likes, ctrValue };
  };

  const processedVideos = useMemo(() => {
    return videos
      .filter(v => {
        const matchesSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = filterSource === 'all' || v.source_type === filterSource;
        const matchesProduct = productFilter === 'all' || (v as any).product_id === productFilter;
        return matchesSearch && matchesSource && matchesProduct;
      })
      .map(v => ({ ...v, metrics: getVideoMetrics(v) }))
      .sort((a, b) => {
        if (!sortColumn || sortColumn === 'recent') {
          return sortDirection === 'asc'
            ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
            : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }

        const getSortValue = (video: any) => {
          switch (sortColumn) {
            case 'nome': return video.title || '';
            case 'produto': return products.find(p => p.id === video.product_id)?.name || 'Sem produto';
            case 'visualizacoes': return Number(video.metrics.views || 0);
            case 'comentarios': return Number(video.metrics.comments || 0);
            case 'curtidas': return Number(video.metrics.likes || 0);
            case 'ctr': return Number(video.metrics.ctrValue || 0);
            default: return '';
          }
        };

        const valueA = getSortValue(a);
        const valueB = getSortValue(b);
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return sortDirection === 'asc'
          ? String(valueA).localeCompare(String(valueB), 'pt-BR')
          : String(valueB).localeCompare(String(valueA), 'pt-BR');
      });
  }, [videos, products, searchTerm, filterSource, productFilter, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'recent' ? 'desc' : 'asc');
  };

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (video: Video) => {
    const checkUsedInStories = async () => {
      try {
        const storyVideos = await db.storyVideos.getAll();
        const isUsed = storyVideos.some(sv => sv.video_id === video.id);
        setDeleteModal({
          isOpen: true,
          videoId: video.id,
          videoTitle: video.title,
          usedInStories: isUsed
        });
      } catch (e) {
        setDeleteModal({
          isOpen: true,
          videoId: video.id,
          videoTitle: video.title,
          usedInStories: false
        });
      }
    };
    checkUsedInStories();
  };

  const handleConfirmDelete = async () => {
    try {
      await db.videos.delete(deleteModal.videoId);
      setVideos(prev => prev.filter(v => v.id !== deleteModal.videoId));
      showSuccess('Vídeo removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      showError('Erro ao excluir o vídeo.');
    }
  };

  const getHeaderClass = (column: string, align: 'left' | 'center' | 'right' = 'left') =>
    cn(
      'cursor-pointer select-none whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:opacity-75',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right'
    );

  const sortIcon = (column: string) => sortColumn === column ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vídeos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os vídeos disponíveis para exibição.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/videos/new')}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Novo Vídeo
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por título..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todas Fontes</option>
            <option value="upload">Upload</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="external_url">URL Externa</option>
          </select>
          <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todos os Produtos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={getHeaderClass('foto')}>Foto</th>
                <th onClick={() => handleSort('nome')} className={getHeaderClass('nome')}>
                  <span className="inline-flex items-center gap-1">Nome {sortIcon('nome')}</span>
                </th>
                <th onClick={() => handleSort('produto')} className={getHeaderClass('produto')}>
                  <span className="inline-flex items-center gap-1">Produto vinculado {sortIcon('produto')}</span>
                </th>
                <th onClick={() => handleSort('visualizacoes')} className={getHeaderClass('visualizacoes', 'center')}>
                  <span className="inline-flex items-center gap-1 justify-center">Visualizações {sortIcon('visualizacoes')}</span>
                </th>
                <th onClick={() => handleSort('comentarios')} className={getHeaderClass('comentarios', 'center')}>
                  <span className="inline-flex items-center gap-1 justify-center">Comentários {sortIcon('comentarios')}</span>
                </th>
                <th onClick={() => handleSort('curtidas')} className={getHeaderClass('curtidas', 'center')}>
                  <span className="inline-flex items-center gap-1 justify-center">Curtidas {sortIcon('curtidas')}</span>
                </th>
                <th onClick={() => handleSort('ctr')} className={getHeaderClass('ctr', 'center')}>
                  <span className="inline-flex items-center gap-1 justify-center">CTR {sortIcon('ctr')}</span>
                </th>
                <th className={getHeaderClass('acoes', 'right')}>Ver</th>
                <th className={getHeaderClass('acoes2', 'right')}>Editar</th>
                <th className={getHeaderClass('acoes3', 'right')}>Excluir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedVideos.map(video => {
                const { views, comments, likes, ctrValue } = video.metrics as any;
                const productName = products.find(p => p.id === (video as any).product_id)?.name || 'Sem produto';
                const thumb = video.thumbnail_url || (video as any).poster_url || (video as any).image_url || '';

                return (
                  <tr key={video.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                    <td className="px-6 py-4">
                      {thumb ? (
                        <img src={thumb} alt={video.title} className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <Film size={18} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 truncate max-w-xs">{video.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100">
                        <Film size={12} /> {productName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{views.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{comments.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{likes.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{Number(ctrValue || 0).toFixed(2).replace('.', ',')}%</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleViewVideo(video)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Ver"><Eye size={16} /></button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => navigate(`/videos/${video.id}/edit`)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Editar"><Edit3 size={16} /></button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteClick(video)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {processedVideos.length === 0 && (
          <div className="p-12 text-center">
            <Film size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Nenhum vídeo encontrado.</p>
          </div>
        )}
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-[240px] mx-auto shrink-0">
              {viewingVideo.video_url ? (
                <video
                  src={viewingVideo.video_url}
                  className="w-full max-w-full h-auto max-h-[400px] rounded-2xl border-4 border-slate-900 shadow-xl"
                  controls
                  autoPlay
                  poster={viewingVideo.thumbnail_url}
                />
              ) : (
                <div className="w-full h-[400px] rounded-2xl border-4 border-slate-900 shadow-xl bg-slate-900 flex flex-col items-center justify-center gap-4 p-4">
                  <p className="text-white text-sm font-bold text-center">
                    {viewingVideo.source_type === 'instagram' ? 'Vídeo do Instagram' : viewingVideo.source_type === 'tiktok' ? 'Vídeo do TikTok' : 'Sem vídeo'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col pt-1">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingVideo.source_type}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                  <p className="text-xs font-black text-emerald-600">Ativo</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Vídeo ID</p>
                  <p className="text-[10px] font-bold text-slate-500">#{viewingVideo.id.substr(0,8)}</p>
                </div>
              </div>
              <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="w-full py-3 bg-[#0094EB] text-white rounded-xl text-xs font-black shadow-lg">Editar Vídeo</button>
            </div>
          </div>
        )}
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Vídeo"
        itemName={deleteModal.videoTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        usedInStories={deleteModal.usedInStories}
      />
    </div>
  );
};

export default VideoGalleryPage;