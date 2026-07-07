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
import CustomDialog from '@/components/CustomDialog';

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

  // Custom Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

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

  const productRelationsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const count = storyProducts.filter((sp) => sp.product_id === p.id).length;
      map.set(p.id, count);
    });
    return map;
  }, [products, storyProducts]);

  const productStatsMap = useMemo(() => {
    const map = new Map<string, { clicks: number; conversions: number; ctr: string }>();
    products.forEach((p, idx) => {
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

  const handleDelete = (id: string, name: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Produto?',
      description: `Tem certeza que deseja remover o produto "${name}"? Todas as chamadas de compra ligadas a esse item nos stories ativos serão desabilitadas.`,
      onConfirm: async () => {
        try {
          await db.products.delete(id);
          const allStoryProducts = await db.storyProducts.getAll();
          const related = allStoryProducts.filter(sp => sp.product_id === id);
          for (const rel of related) {
            await db.storyProducts.delete(rel.id);
          }
          showSuccess('Produto removido com sucesso!');
          setDialog(prev => ({ ...prev, isOpen: false }));
          loadProductsList();
        } catch (e) {
          showError('Erro ao excluir produto.');
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
    });
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
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Módulo Produtos
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Cadastre e gerencie os produtos da sua loja para vinculá-los às chamadas de ação dos stories em vídeo.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-3 rounded-2xl font-bold text-sm md:text-base shadow-lg transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Adicionar produto
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl mx-auto animate-fade-in">
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
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm md:text-base text-slate-100 placeholder-slate-650 font-bold"
                    placeholder="Ex: Vestido Floral Verão..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    SKU (Código único)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-700 font-mono"
                    placeholder="Ex: PROD-1234-A"
                  />
                </div>

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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 font-semibold"
                      placeholder="129.90"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Status de Ativação
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                      formData.active
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    <span>{formData.active ? 'Ativo (Disponível para venda)' : 'Inativo'}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${formData.active ? 'bg-emerald-500 shadow-lg' : 'bg-slate-600'}`}></span>
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL / Link de Compra do Produto *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.product_url}
                    onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono"
                    placeholder="https://sualoja.com.br/produtos/vestido"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL da Imagem do Produto
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Descrição Curta
                  </label>
                  <textarea
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-700 resize-y"
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
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou link do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-semibold text-slate-200"
            />
          </div>

          <div className="w-full md:w-auto min-w-[200px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-transparent border-none text-xs md:text-sm font-bold text-slate-300 focus:outline-none cursor-pointer py-1.5"
            >
              <option value="all" className="bg-slate-900">Todos os status</option>
              <option value="active" className="bg-slate-900">Apenas ativos</option>
              <option value="inactive" className="bg-slate-900">Apenas inativos</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto">
            <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum produto correspondente</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Não encontramos resultados para seus filtros. Adicione um novo produto ou limpe o campo de busca.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] md:text-xs tracking-wider">
                    <th className="p-4 pl-6 w-[80px]">Imagem</th>
                    <th className="p-4">Nome / Descrição</th>
                    <th className="p-4 text-center">Preço</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4 text-center">Stories</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {filteredProducts.map((p) => {
                    const relationsCount = productRelationsCountMap.get(p.id) || 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-all group">
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

                        <td className="p-4 max-w-[220px]">
                          <p className="font-bold text-slate-200 text-sm md:text-base truncate group-hover:text-violet-400 transition-colors">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {p.short_description || 'Nenhuma descrição cadastrada.'}
                          </p>
                        </td>

                        <td className="p-4 text-center font-bold text-slate-100 text-sm md:text-base">
                          R$ {p.price.toFixed(2)}
                        </td>

                        <td className="p-4 font-mono text-slate-400">
                          {p.sku || <span className="text-slate-700 italic">vazio</span>}
                        </td>

                        <td className="p-4 text-center font-bold text-violet-400">
                          {relationsCount}
                        </td>

                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            p.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {p.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        <td className="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedMetricsProduct(p)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"
                            title="Visualizar Estatísticas"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 transition-all inline-flex items-center"
                            title="Editar Produto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"
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

      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText="Confirmar"
        cancelText="Voltar"
      />
    </div>
  );
};

export default ProductsPage;