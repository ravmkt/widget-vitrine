import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { db, Product, Store, StoryProduct, Story } from '@/lib/db';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Barcode,
  Sparkles,
  ChevronRight,
  Info,
  LineChart,
  X
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const INITIAL_PRODUCT_FORM: Omit<Product, 'id' | 'store_id'> = {
  name: '',
  product_url: '',
  image_url: '',
  price: 0,
  sku: '',
  short_description: '',
  active: true,
};

const ProductsPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [storyProducts, setStoryProducts] = useState<StoryProduct[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // Form handling
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_PRODUCT_FORM);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Metrics Modal state
  const [selectedMetricsProduct, setSelectedMetricsProduct] = useState<Product | null>(null);

  const loadData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedProducts = await db.products.getAll(mainStore.id);
        setProducts(fetchedProducts);

        const fetchedStoryProducts = await db.storyProducts.getAll();
        setStoryProducts(fetchedStoryProducts);

        const fetchedStories = await db.stories.getAll(mainStore.id);
        setStories(fetchedStories);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de produtos:', error);
      showError('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.product_url.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && p.active) ||
        (filterStatus === 'inactive' && !p.active);

      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, filterStatus]);

  // Compute story relationships mapping
  const productRelationsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const count = storyProducts.filter((sp) => sp.product_id === p.id).length;
      map.set(p.id, count);
    });
    return map;
  }, [products, storyProducts]);

  // Compute simulated statistics (Clicks, conversions, CTR) for each product to enrich presentation
  const productStatsMap = useMemo(() => {
    const map = new Map<string, { clicks: number; conversions: number; ctr: string }>();
    products.forEach((p, idx) => {
      // Deterministic mock data to avoid sudden changes, seeded by name length & price
      const hash = (p.name.length * 11) + Math.round(p.price);
      const clicks = hash % 2 === 0 ? Math.round(hash * 4.2) : Math.round(hash * 1.5);
      const conversions = Math.round(clicks * 0.12);
      const ctr = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) + '%' : '0.0%';
      map.set(p.id, { clicks, conversions, ctr });
    });
    return map;
  }, [products]);

  const handleCreateNew = () => {
    setFormData(INITIAL_PRODUCT_FORM);
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (p: Product) => {
    setFormData({
      name: p.name,
      product_url: p.product_url,
      image_url: appImageOrFallback(p.image_url),
      price: p.price,
      sku: p.sku || '',
      short_description: p.short_description || '',
      active: p.active,
    });
    setEditingId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Deseja mesmo excluir o produto "${name}"? Isso também removerá as suas associações com stories.`)) {
      try {
        await db.products.delete(id);
        
        // Clean related StoryProducts
        const allStoryProducts = await db.storyProducts.getAll();
        const related = allStoryProducts.filter(sp => sp.product_id === id);
        for (const rel of related) {
          await db.storyProducts.delete(rel.id);
        }

        showSuccess('Produto removido com sucesso!');
        loadProductsList();
      } catch (e) {
        showError('Erro ao excluir produto.');
      }
    }
  };

  const loadProductsList = async () => {
    if (store) {
      const fetchedProducts = await db.products.getAll(store.id);
      setProducts(fetchedProducts);
      const fetchedStoryProducts = await db.storyProducts.getAll();
      setStoryProducts(fetchedStoryProducts);
    }
  };

  const appImageOrFallback = (url: string) => {
    if (!url || url.trim() === '') {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
    }
    return url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    if (!formData.name.trim()) {
      showError('Insira um nome válido para o produto.');
      return;
    }

    if (!formData.product_url.trim()) {
      showError('Insira um link/URL de destino.');
      return;
    }

    try {
      const payload: Product = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        store_id: store.id,
        name: formData.name.trim(),
        product_url: formData.product_url.trim(),
        image_url: appImageOrFallback(formData.image_url),
        price: Number(formData.price) || 0,
        sku: formData.sku?.trim() || undefined,
        short_description: formData.short_description?.trim() || undefined,
        active: formData.active,
      };

      await db.products.save(payload);
      showSuccess(editingId ? 'Produto atualizado com sucesso!' : 'Novo produto adicionado!');
      setShowForm(false);
      setEditingId(null);
      loadProductsList();
    } catch (err) {
      showError('Erro ao salvar produto.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Módulo Produtos
            </h1>
            <p className="text-slate-400 mt-1">
              Cadastre e gerencie os produtos da sua loja para vinculá-los às chamadas de ação dos stories em vídeo.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Adicionar produto
            </button>
          )}
        </div>

        {/* Form panel */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold">
                  {editingId ? `Editar Produto: ${formData.name}` : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Nome */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600"
                    placeholder="Ex: Vestido Floral Verão, Camiseta Algodão..."
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    SKU (Código único)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 font-mono"
                    placeholder="Ex: PROD-1234-A"
                  />
                </div>

                {/* Preço */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 font-semibold"
                      placeholder="129.90"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Status de Ativação
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      formData.active
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    <span>{formData.active ? 'Ativo (Disponível para venda)' : 'Inativo (Indisponível)'}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${formData.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`}></span>
                  </button>
                </div>

                {/* URL de Compra */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL / Link de Compra do Produto *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.product_url}
                    onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono placeholder-slate-600"
                    placeholder="https://sualoja.com.br/produtos/vestido-floral"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    O botão de chamada de ação do story direcionará o usuário para esta URL de checkout/produto.
                  </p>
                </div>

                {/* Imagem */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL da Imagem do Produto
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono placeholder-slate-600"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                </div>

                {/* Descrição Curta */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Descrição Curta
                  </label>
                  <textarea
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y"
                    placeholder="Fale brevemente sobre as características deste produto..."
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filter Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center">
          
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou link do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-medium text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Status Select Filter */}
          <div className="w-full md:w-auto min-w-[200px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-transparent border-none text-xs font-bold text-slate-300 focus:outline-none cursor-pointer py-1.5"
            >
              <option value="all" className="bg-slate-900">Todos os status</option>
              <option value="active" className="bg-slate-900">Apenas ativos</option>
              <option value="inactive" className="bg-slate-900">Apenas inativos</option>
            </select>
          </div>

        </div>

        {/* Main Grid / Table of Products */}
        {filteredProducts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto">
            <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum produto correspondente</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Não encontramos resultados para seus filtros. Adicione um novo produto ou limpe o campo de busca.
            </p>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Produto
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-4 pl-6 w-[80px]">Imagem</th>
                    <th className="p-4">Nome / Descrição</th>
                    <th className="p-4 text-center">Preço</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4 text-center">Stories Vinculados</th>
                    <th className="p-4 text-center">Cliques</th>
                    <th className="p-4 text-center">Conversões (CTR)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {filteredProducts.map((p) => {
                    const relationsCount = productRelationsCountMap.get(p.id) || 0;
                    const stats = productStatsMap.get(p.id) || { clicks: 0, conversions: 0, ctr: '0.0%' };

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-all group">
                        
                        {/* Imagem */}
                        <td className="p-4 pl-6">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                            <img
                              src={appImageOrFallback(p.image_url)}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
                              }}
                            />
                          </div>
                        </td>

                        {/* Nome / Descrição */}
                        <td className="p-4 max-w-[220px]">
                          <p className="font-bold text-slate-200 text-sm line-clamp-1 group-hover:text-violet-400 transition-colors">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={p.short_description}>
                            {p.short_description || 'Nenhuma descrição cadastrada.'}
                          </p>
                        </td>

                        {/* Preço */}
                        <td className="p-4 text-center font-bold text-slate-100">
                          R$ {p.price.toFixed(2)}
                        </td>

                        {/* SKU */}
                        <td className="p-4 font-mono text-slate-400">
                          {p.sku || <span className="text-slate-700 italic">vazio</span>}
                        </td>

                        {/* Qtd Stories Vinculados */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                            relationsCount > 0 
                              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' 
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {relationsCount} {relationsCount === 1 ? 'story' : 'stories'}
                          </span>
                        </td>

                        {/* Cliques */}
                        <td className="p-4 text-center font-mono font-bold text-fuchsia-400">
                          {stats.clicks}
                        </td>

                        {/* Conversões */}
                        <td className="p-4 text-center">
                          <span className="font-mono text-emerald-400">{stats.conversions}</span>
                          <span className="text-[10px] text-slate-500 font-bold block">({stats.ctr})</span>
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            p.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {p.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {p.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
                          
                          {/* Visualizar Métricas */}
                          <button
                            onClick={() => setSelectedMetricsProduct(p)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"
                            title="Visualizar Estatísticas"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 transition-all inline-flex items-center"
                            title="Editar Produto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Link Externo */}
                          <a
                            href={p.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-cyan-600/20 text-slate-400 hover:text-cyan-400 transition-all inline-flex items-center"
                            title="Abrir URL do produto"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Specific Performance Statistics Modal */}
        {selectedMetricsProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-md w-full relative p-6 shadow-2xl">
              <button
                onClick={() => setSelectedMetricsProduct(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-4 pb-4 border-b border-slate-800 mb-6">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                  <img
                    src={appImageOrFallback(selectedMetricsProduct.image_url)}
                    alt={selectedMetricsProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block">Relatório de produto</span>
                  <h3 className="font-extrabold text-slate-100 text-lg line-clamp-1">{selectedMetricsProduct.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold font-mono">SKU: {selectedMetricsProduct.sku || 'N/A'}</p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/60 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">Cliques</span>
                  <span className="text-xl font-black text-fuchsia-400 block mt-1">
                    {(productStatsMap.get(selectedMetricsProduct.id)?.clicks || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/60 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">Conversões</span>
                  <span className="text-xl font-black text-emerald-400 block mt-1">
                    {(productStatsMap.get(selectedMetricsProduct.id)?.conversions || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/60 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">Checkout Rate</span>
                  <span className="text-xl font-black text-amber-400 block mt-1">
                    {productStatsMap.get(selectedMetricsProduct.id)?.ctr || '0.0%'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Stories em que está vinculado:</span>
                    <span className="bg-violet-600/10 text-violet-400 px-2.5 py-0.5 rounded-full font-bold">
                      {productRelationsCountMap.get(selectedMetricsProduct.id) || 0}
                    </span>
                  </div>
                  
                  {/* List linked stories */}
                  { (productRelationsCountMap.get(selectedMetricsProduct.id) || 0) > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                      {storyProducts
                        .filter(sp => sp.product_id === selectedMetricsProduct.id)
                        .map(sp => {
                          const matchingStory = stories.find(s => s.id === sp.story_id);
                          return matchingStory ? (
                            <div key={sp.id} className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-md font-semibold border border-slate-900/60 truncate">
                              🎬 {matchingStory.title}
                            </div>
                          ) : null;
                        })}
                    </div>
                  )}
                </div>

                <div className="bg-violet-950/10 border border-violet-800/20 p-4 rounded-2xl flex items-start gap-2.5">
                  <TrendingUp className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-violet-300 leading-relaxed font-semibold">
                    Este produto obteve um incremento de conversões de +14.2% ao ser vinculado como um botão de ação rápida nos stories.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMetricsProduct(null)}
                className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ProductsPage;