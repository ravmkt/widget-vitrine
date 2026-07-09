"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video, Product } from '@/lib/db';
import { 
  Plus, 
  Search, 
  Play, 
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
import { subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';

const ProductsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'manual' | 'integration'>('all');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    productId: string; 
    productTitle: string; 
  }>({
    isOpen: false,
    productId: '',
    productTitle: ''
  });

  const [categories, setCategories] = useState<string[]>([]);

  const calculateProductMetrics = (productId: string) => {
    const end = new Date();
    const start = subDays(end, 30);
    const seed = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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

    const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return { views, likes, comments, engagement };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allProducts, allVideos] = await Promise.all([
          db.products.getAll(),
          db.videos.getAll()
        ]);
        setProducts(allProducts);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } catch (e) {
        showError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const processedProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.active : !p.active);
        const matchesOrigin = filterOrigin === 'all' || p.origin === filterOrigin;
        return matchesSearch && matchesCategory && matchesStatus && matchesOrigin;
      })
      .map(p => {
        const metrics = calculateProductMetrics(p.id);
        return { ...p, metrics };
      });
  }, [products, searchTerm, filterCategory, filterStatus, filterOrigin]);

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteModal({
      isOpen: true,
      productId: product.id,
      productTitle: product.name
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.products.delete(deleteModal.productId);
      setProducts(prev => prev.filter(p => p.id !== deleteModal.productId));
      showSuccess('Produto removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      showError('Erro ao excluir o produto.');
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const updated = { ...product, active: !product.active };
      await db.products.save(updated);
      setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
      showSuccess(`Produto ${updated.active ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (e) {
      showError('Erro ao alterar status.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"><ArrowLeft size={18}/></button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Produtos</h1>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/products/new')}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Novo produto
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
          </select>
          
          <select 
            value={filterOrigin} 
            onChange={e => setFilterOrigin(e.target.value as any)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Origens</option>
            <option value="manual">Manual</option>
            <option value="integration">Integração</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processedProducts.map(product => {
          const { views, likes, comments, engagement } = product.metrics;
          
          return (
            <div key={product.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
              <div className="aspect-[16/9] bg-slate-900 relative cursor-pointer" onClick={() => handleViewProduct(product)}>
                 <img src={product.image_url} className="w-full h-full object-cover opacity-80" alt={product.name} />
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40">
                    <Play size={32} className="text-white fill-white" />
                 </div>
              </div>
              <div className="p-4">
                 <h4 className="font-bold text-slate-800 truncate text-sm mb-3">{product.name}</h4>
                 
                 <div className="flex items-center gap-2 mb-4 text-slate-600">
                   <Film className="text-[#0094EB]" size={18} />
                   <span className="text-sm font-semibold truncate">{product.category}</span>
                 </div>

                 <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4">
                   <div className="flex items-center gap-2">
                     <Eye className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{views.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{likes.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <MessageCircle className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{comments.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <TrendingUp className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{engagement.toFixed(1)}%</span>
                   </div>
                 </div>

                 <div className="flex items-center justify-between">
                   <span 
                     onClick={() => handleToggleStatus(product)}
                     className={cn(
                       "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                       product.active 
                         ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                         : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                     )}
                   >
                     {product.active ? <CheckCircle2 size={10} /> : <X size={10} />}
                     {product.active ? 'Ativo' : 'Desativado'}
                   </span>
                   
                   <span className={cn(
                     "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                     product.origin === 'manual' 
                       ? "bg-blue-50 text-blue-600 border-blue-100" 
                       : "bg-violet-50 text-violet-600 border-violet-100"
                   )}>
                     {product.origin === 'manual' ? 'Manual' : 'Integração'}
                   </span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Produto" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingProduct && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-[240px] mx-auto shrink-0">
               <img 
                 src={viewingProduct.image_url} 
                 className="w-full max-w-full h-auto max-h-[400px] rounded-2xl border-4 border-slate-900 shadow-xl object-cover" 
                 alt={viewingProduct.name}
               />
            </div>
            <div className="flex-1 flex flex-col pt-1">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900 mb-1">{viewingProduct.name}</h3>
                <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{viewingProduct.category}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Preço</p>
                    <p className="text-sm font-black text-slate-900">{viewingProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                    <p className={cn("text-sm font-black", viewingProduct.active ? "text-emerald-600" : "text-rose-600")}>
                      {viewingProduct.active ? 'Ativo' : 'Desativado'}
                    </p>
                 </div>
              </div>
              <button onClick={() => navigate(`/products/${viewingProduct.id}/edit`)} className="w-full py-3 bg-[#0094EB] text-white rounded-xl text-xs font-black shadow-lg">Editar Produto</button>
            </div>
          </div>
        )}
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Produto"
        itemName={deleteModal.productTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ProductsPage;
<dyad-write path="src/pages/ProductsPage.tsx">
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video, Product } from '@/lib/db';
import { 
  Plus, 
  Search, 
  Play, 
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
import { subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';

const ProductsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'manual' | 'integration'>('all');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    productId: string; 
    productTitle: string; 
  }>({
    isOpen: false,
    productId: '',
    productTitle: ''
  });

  const [categories, setCategories] = useState<string[]>([]);

  const calculateProductMetrics = (productId: string) => {
    const end = new Date();
    const start = subDays(end, 30);
    const seed = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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

    const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return { views, likes, comments, engagement };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allProducts, allVideos] = await Promise.all([
          db.products.getAll(),
          db.videos.getAll()
        ]);
        setProducts(allProducts);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } catch (e) {
        showError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const processedProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.active : !p.active);
        const matchesOrigin = filterOrigin === 'all' || p.origin === filterOrigin;
        return matchesSearch && matchesCategory && matchesStatus && matchesOrigin;
      })
      .map(p => {
        const metrics = calculateProductMetrics(p.id);
        return { ...p, metrics };
      });
  }, [products, searchTerm, filterCategory, filterStatus, filterOrigin]);

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteModal({
      isOpen: true,
      productId: product.id,
      productTitle: product.name
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.products.delete(deleteModal.productId);
      setProducts(prev => prev.filter(p => p.id !== deleteModal.productId));
      showSuccess('Produto removido permanentemente.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (e) {
      showError('Erro ao excluir o produto.');
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const updated = { ...product, active: !product.active };
      await db.products.save(updated);
      setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
      showSuccess(`Produto ${updated.active ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (e) {
      showError('Erro ao alterar status.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"><ArrowLeft size={18}/></button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Produtos</h1>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/products/new')}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Novo produto
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
          </select>
          
          <select 
            value={filterOrigin} 
            onChange={e => setFilterOrigin(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Origens</option>
            <option value="manual">Manual</option>
            <option value="integration">Integração</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processedProducts.map(product => {
          const { views, likes, comments, engagement } = product.metrics;
          
          return (
            <div key={product.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
              <div className="aspect-[16/9] bg-slate-900 relative cursor-pointer" onClick={() => handleViewProduct(product)}>
                 <img src={product.image_url} className="w-full h-full object-cover opacity-80" alt={product.name} />
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40">
                    <Play size={32} className="text-white fill-white" />
                 </div>
              </div>
              <div className="p-4">
                 <h4 className="font-bold text-slate-800 truncate text-sm mb-3">{product.name}</h4>
                 
                 <div className="flex items-center gap-2 mb-4 text-slate-600">
                   <Film className="text-[#0094EB]" size={18} />
                   <span className="text-sm font-semibold truncate">{product.category}</span>
                 </div>

                 <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4">
                   <div className="flex items-center gap-2">
                     <Eye className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{views.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{likes.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <MessageCircle className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{comments.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <TrendingUp className="text-[#0094EB]" size={18} />
                     <span className="text-sm font-semibold text-slate-700">{engagement.toFixed(1)}%</span>
                   </div>
                 </div>

                 <div className="flex items-center justify-between">
                   <span 
                     onClick={() => handleToggleStatus(product)}
                     className={cn(
                       "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                       product.active 
                         ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                         : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                     )}
                   >
                     {product.active ? <CheckCircle2 size={10} /> : <X size={10} />}
                     {product.active ? 'Ativo' : 'Desativado'}
                   </span>
                   
                   <span className={cn(
                     "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                     product.origin === 'manual' 
                       ? "bg-blue-50 text-blue-600 border-blue-100" 
                       : "bg-violet-50 text-violet-600 border-violet-100"
                   )}>
                     {product.origin === 'manual' ? 'Manual' : 'Integração'}
                   </span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Produto" maxWidth="max-w-3xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingProduct && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-[240px] mx-auto shrink-0">
               <img 
                 src={viewingProduct.image_url} 
                 className="w-full max-w-full h-auto max-h-[400px] rounded-2xl border-4 border-slate-900 shadow-xl object-cover" 
                 alt={viewingProduct.name}
               />
            </div>
            <div className="flex-1 flex flex-col pt-1">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900 mb-1">{viewingProduct.name}</h3>
                <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{viewingProduct.category}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Preço</p>
                    <p className="text-sm font-black text-slate-900">{viewingProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                    <p className={cn("text-sm font-black", viewingProduct.active ? "text-emerald-600" : "text-rose-600")}>
                      {viewingProduct.active ? 'Ativo' : 'Desativado'}
                    </p>
                 </div>
              </div>
              <button onClick={() => navigate(`/products/${viewingProduct.id}/edit`)} className="w-full py-3 bg-[#0094EB] text-white rounded-xl text-xs font-black shadow-lg">Editar Produto</button>
            </div>
          </div>
        )}
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Produto"
        itemName={deleteModal.productTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ProductsPage;