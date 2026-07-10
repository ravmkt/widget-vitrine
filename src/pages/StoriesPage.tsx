"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Story, Video, Product } from '@/lib/db';
import { 
  Plus, 
  Search, 
  PlayCircle, 
  Trash2, 
  Edit3, 
  ArrowLeft,
  Eye,
  Film,
  CheckCircle2,
  MessageCircle,
  TrendingUp
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

const StoriesPage = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'instagram' | 'tiktok' | 'external_url'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [orderBy, setOrderBy] = useState<string>('recent');

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

  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    instagram_link: '',
    tiktok_link: '',
    thumbnail_url: '',
    product_id: '',
    model_id: '',
    active: true,
    origin: 'url' as 'url' | 'instagram' | 'tiktok' | 'upload',
    video_file: null as File | null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const loadData = async () => {
    try {
      const [allVideos, allProducts] = await Promise.all([
        db.videos.getAll(),
        db.products.getAll()
      ]);
      setVideos(allVideos);
      setProducts(allProducts);
      setLoading(false);
    } catch (e) {
      showError('Erro ao carregar vídeos.');
      setLoading(false);
    }
  };
  loadData();

  const processedVideos = useMemo(() => {
    // ... existing processing logic ...
    return videos
      .filter(v => {
        const matchesSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = filterSource === 'all' || v.source_type === filterSource;
        const matchesProduct = productFilter === 'all' || (v as any).product_id === productFilter;
        return matchesSearch && matchesSource && matchesProduct;
      })
      .map(v => {
        // ... existing metrics calculation ...
        return { ...v, metrics: { /* ... */ } };
      })
      .sort((a, b) => {
        // ... existing sort logic ...
        return 0;
      });
  }, [videos, products, searchTerm, filterSource, productFilter, orderBy]);

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewingModalOpen(true);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stories</h1>
          <p className="text-slate-500 font-medium mt-1">
            Gerencie o catálogo de exibição e agrupamento de vídeos.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0094EB]"
            >
              <option value="all">Todas Fontes</option>
              <option value="upload">Upload</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="external_url">URL Externa</option>
            </select>
            
            <select 
              value={productFilter} 
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0094EB]"
            >
              <option value="all">Todos os Produtos</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            
            <select 
              value={orderBy} 
              onChange={(e) => setOrderBy(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="recent">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="views_desc">Mais Visualizações</option>
              <option value="views_asc">Menos Visualizações</option>
              <option value="likes_desc">Mais Curtidas</option>
              <option value="likes_asc">Menos Curtidas</option>
              <option value="comments_desc">Mais Comentários</option>
              <option value="comments_asc">Menos Comentários</option>
              <option value="engagement_desc">Maior Engajamento</option>
              <option value="engagement_asc">Menor Engajamento</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {processedVideos.map(video => {
          // ... existing video card rendering ...
          return (
            <div key={video.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
              {/* ... existing card content ... */}
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => handleViewVideo(video)}
                  className="flex-1 bg-[#EAF6FF] text-[#0094EB] py-3 rounded-xl text-xs font-black transition-all"
                  title="Ver vídeo"
                >
                  Ver
                </button>
                <button 
                  type="button"
                  onClick={() => navigate(`/stories/${video.id}/edit`)}
                  className="p-3 bg-[#EAF6FF] text-[#0094EB] hover:bg-[#0094EB] hover:text-white rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteClick(video)}
                  className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
                {/* NEW Preview button */}
                <button 
                  type="button"
                  onClick={() => window.open(`/stories/preview/${video.id}`, '_blank')}
                  className="p-3 bg-[#EAF6FF] text-[#0094EB] hover:bg-[#0094EB] hover:text-white rounded-xl transition-all"
                  title="Preview"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-3xl" onCancel={() => setIsViewingModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-[240px] mx-auto shrink-0">
              {viewingVideo.video_url ? (
                <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh]">
                  <video src={viewingVideo.video_url} className="w-full max-w-full h-auto max-h-[400px] object-fit contain" poster={viewingVideo.thumbnail_url} controls autoPlay loop />
                </div>
              ) : (
                <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh] flex flex-col items-center justify-center gap-4 p-4">
                  <p className="text-white text-sm font-bold text-center">
                    {viewingVideo.source_type === 'instagram' ? 'Vídeo do Instagram' : viewingVideo.source_type === 'tiktok' ? 'Vídeo do TikTok' : 'Sem vídeo'}
                  </p>
                  {viewingVideo.instagram_link && (
                    <a href={viewingVideo.instagram_link} target="_blank" rel="noreferrer" className="bg-[#0094EB] text-white px-4 py-2 rounded-xl text-xs font-black">Abrir no Instagram</a>
                  )}
                  {viewingVideo.tiktok_link && (
                    <a href={viewingVideo.tiktok_link} target="_blank" rel="noreferrer" className="bg-[#0094EB] text-white px-4 py-2 rounded-xl text-xs font-black">Abrir no TikTok</a>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col pt-1">
              {/* ... existing preview content ... */}
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
      />
    </div>
  );
};

export default StoriesPage;