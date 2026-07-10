"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Tag, Upload, Search, Edit3, Trash2, X, CheckCircle2, XCircle, Image, Download, Settings, Loader2, Save, FileSpreadsheet, Globe, Package } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { db, Product } from '@/lib/db';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    { id: '1', name: 'Vestidos' },
    { id: '2', name: 'Blusas' },
    { id: '3', name: 'Calças' },
    { id: '4', name: 'Acessórios' },
    { id: '5', name: 'Sapatos' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState('xml');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    product_url: '',
    active: true,
    image_url: '',
    image_file: null as File | null,
    image_error: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string; productTitle: string }>({
    isOpen: false,
    productId: '',
    productTitle: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [allProducts] = await Promise.all([db.products.getAll()]);
        setProducts(allProducts);
      } catch (e) {
        showError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || (p as any).category === filterCategory;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? (p as any).active : !(p as any).active);
      const matchesOrigin = filterOrigin === 'all' || (p as any).origin === filterOrigin;
      return matchesSearch && matchesCategory && matchesStatus && matchesOrigin;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterOrigin]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 350 * 1024) {
      setFormData(prev => ({ ...prev, image_error: 'A imagem deve ter no máximo 350 KB.', image_file: null }));
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormData(prev => ({ ...prev, image_error: 'Formato inválido. Use JPG, PNG ou WEBP.', image_file: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, image_file: file, image_url: reader.result as string, image_error: '' }));
    };
    reader.readAsDataURL(file);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: '', price: '', product_url: '', active: true, image_url: '', image_file: null, image_error: '' });
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: (product as any).category || '',
      price: String(product.price ?? ''),
      product_url: product.product_url || '',
      active: product.active,
      image_url: product.image_url,
      image_file: null,
      image_error: '',
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Nome do produto é obrigatório.');
    if (!formData.category) errors.push('Categoria é obrigatória.');
    if (!formData.price || parseFloat(formData.price) <= 0) errors.push('Preço válido é obrigatório.');
    if (formData.image_error) errors.push(formData.image_error);
    if (errors.length > 0) { errors.forEach(showError); return; }

    setIsSaving(true);
    setTimeout(async () => {
      try {
        const storeId = '11111111-1111-1111-1111-111111111111';
        if (editingProduct) {
          const updated: Product = {
            ...editingProduct,
            name: formData.name,
            image_url: formData.image_url || editingProduct.image_url,
            product_url: formData.product_url,
            price: parseFloat(formData.price),
            active: formData.active,
            updated_at: new Date().toISOString(),
            category: formData.category,
          } as Product & Record<string, any>;
          await db.products.save(updated as Product);
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
          showSuccess('Produto atualizado com sucesso!');
        } else {
          const newProduct: Product = {
            id: Math.random().toString(36).slice(2, 11),
            store_id: storeId,
            name: formData.name,
            image_url: formData.image_url || '',
            product_url: formData.product_url,
            price: parseFloat(formData.price),
            active: formData.active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: formData.category,
          } as Product & Record<string, any>;
          await db.products.save(newProduct as Product);
          setProducts(prev => [newProduct, ...prev]);
          showSuccess('Produto criado com sucesso!');
        }
        setShowProductModal(false);
      } catch {
        showError('Erro ao salvar produto.');
      } finally {
        setIsSaving(false);
      }
    }, 300);
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteModal({ isOpen: true, productId: product.id, productTitle: product.name });
  };

  const handleConfirmDelete = async () => {
    await db.products.delete(deleteModal.productId);
    setProducts(prev => prev.filter(p => p.id !== deleteModal.productId));
    showSuccess('Produto removido.');
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleToggleStatus = (product: Product) => {
    const nextActive = !(product as any).active;
    const updated = { ...product, active: nextActive } as Product;
    db.products.save(updated);
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
  };

  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState('');
  const [catNewName, setCatNewName] = useState('');

  const handleCatAdd = () => {
    if (!catNewName.trim()) return;
    setCategories(prev => [...prev, { id: Date.now().toString(), name: catNewName.trim() }]);
    setCatNewName('');
  };
  const handleCatEditStart = (cat: any) => { setCatEditingId(cat.id); setCatEditName(cat.name); };
  const handleCatEditSave = (id: string) => {
    if (!catEditName.trim()) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: catEditName.trim() } : c));
    setCatEditingId(null); setCatEditName('');
  };
  const handleCatDelete = (id: string) => {
    if (window.confirm('Excluir esta categoria?')) setCategories(prev => prev.filter(c => c.id !== id));
  };
  const handleCatSaveAll = () => { setShowCategoriesModal(false); };

  const [xmlUrl, setXmlUrl] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [yampiToken, setYampiToken] = useState('');
  const [yampiUrl, setYampiUrl] = useState('');
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);

  const handleXmlImport = () => { if (!xmlUrl && !xmlFile) { showError('Informe URL ou arquivo XML.'); return; } showSuccess('Importação XML iniciada (simulação)'); setShowImportModal(false); };
  const handleApiImport = () => { if (!yampiToken || !yampiUrl) { showError('Preencha token e URL.'); return; } showSuccess('Importação API Yampi iniciada (simulação)'); setShowImportModal(false); };
  const handleSpreadsheetImport = () => { if (!spreadsheetFile) { showError('Selecione arquivo.'); return; } showSuccess('Importação planilha iniciada (simulação)'); setShowImportModal(false); };
  const downloadTemplate = () => {
    const csv = 'nome,categoria,preco,link,imagem_url,status\n"Vestido Floral","Vestidos",189.90,"https://loja.com/produto","https://img.com/1.jpg",ativo\n"Blusa Básica","Blusas",79.90,"https://loja.com/produto","https://img.com/2.jpg",ativo';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'modelo-produtos.csv'; link.click();
    showSuccess('Modelo baixado!');
  };

  const activeCategories = categories.map(c => c.name);

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie o catálogo de produtos da sua loja.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={openNewProduct} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2">
            <Plus size={18} /> Novo produto
          </button>
          <button onClick={() => setShowCategoriesModal(true)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center gap-2">
            <Tag size={18} /> Categorias
          </button>
          <button onClick={() => setShowImportModal(true)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-xl font-black text-sm shadow-sm transition-all flex items-center gap-2">
            <Upload size={18} /> Importar produtos
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todas Categorias</option>
            {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
          </select>
          <select value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todas Origens</option>
            <option value="manual">Manual</option>
            <option value="integration">Integração</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-20">Foto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right w-32">Preço</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-36">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-48">Vídeo Vinculado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-28 text-center">Origem</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-28 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-48 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-xl object-cover border border-slate-200" onError={e => { e.currentTarget.src = 'https://via.placeholder.com/48'; }} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 truncate max-w-xs">{product.name}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">
                    {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100">
                      <Tag size={12} /> {(product as any).category || 'Sem categoria'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(product as any).video ? (
                      <span className="flex items-center gap-1.5 text-[#0094EB] text-sm font-bold">{(product as any).video}</span>
                    ) : (
                      <span className="text-slate-400 text-sm italic">Nenhum</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      (product as any).origin === 'manual' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-violet-50 text-violet-600 border-violet-100"
                    )}>
                      {(product as any).origin === 'manual' ? <Tag size={10} /> : <Globe size={10} />}
                      {(product as any).origin === 'manual' ? 'Manual' : 'Integração'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(product)}
                      className={cn(
                        "inline-flex h-8 w-[112px] min-w-[112px] items-center justify-center gap-1 rounded-lg px-4 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all mx-auto",
                        (product as any).active
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                      )}
                    >
                      {(product as any).active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {(product as any).active ? 'Ativo' : 'Desativado'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditProduct(product)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors" title="Editar"><Edit3 size={16} /></button>
                      <button onClick={() => handleDeleteClick(product)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-bold">Nenhum produto encontrado.</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou cadastre um novo produto.</p>
          </div>
        )}
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowProductModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form id="product-form" onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto do Produto (máx. 350 KB)</label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                    {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" /> : <Image className="w-8 h-8 text-slate-400" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all" />
                    {formData.image_error && <p className="text-xs text-rose-500">{formData.image_error}</p>}
                    {formData.image_file && <p className="text-xs text-slate-500">{formData.image_file.name} ({(formData.image_file.size/1024).toFixed(1)} KB)</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]">
                  <option value="">Selecione uma categoria</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</label>
                <input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" placeholder="0,00" />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Link do Produto</label>
                <input type="url" value={formData.product_url} onChange={e => setFormData({...formData, product_url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" placeholder="https://sualoja.com/produto" />
              </div>
              {editingProduct && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                  <select value={formData.active ? 'true' : 'false'} onChange={e => setFormData({...formData, active: e.target.value === 'true'})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]">
                    <option value="true">Ativo</option>
                    <option value="false">Desativado</option>
                  </select>
                </div>
              )}
            </form>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-[2rem]">
              <button type="button" onClick={() => setShowProductModal(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-50 transition-all">Cancelar</button>
              <button type="submit" form="product-form" className="px-6 py-3 bg-[#0094EB] text-white rounded-xl font-black text-sm hover:bg-[#0E4787] transition-all flex items-center gap-2" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="EXCLUIR PRODUTO" itemName={deleteModal.productTitle} onConfirm={handleConfirmDelete} onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
};

export default ProductsPage;
