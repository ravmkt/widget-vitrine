import React, { useEffect, useState, useMemo } from 'react';
import { db, Product } from '@/lib/db';
import { Plus, ShoppingBag, Search, ExternalLink, Trash2, Edit3, X, Package, FileCode, FileSpreadsheet, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'xml' | 'integration' | 'spreadsheet'>('xml');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    sku: '',
    image_url: '',
    product_url: '',
  });

  const loadData = async () => {
    const all = await db.products.getAll();
    setProducts(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || sku.includes(search);
    });
  }, [products, searchTerm]);

  const resetForm = () => {
    setFormData({ name: '', price: '', sku: '', image_url: '', product_url: '' });
    setEditingProduct(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.product_url) {
      showError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const productData: Product = {
        id: editingProduct?.id || Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        name: formData.name,
        price: parseFloat(formData.price),
        sku: formData.sku,
        image_url: formData.image_url || 'https://via.placeholder.com/150',
        product_url: formData.product_url,
        active: true,
      };

      await db.products.save(productData);
      showSuccess(editingProduct ? 'Produto atualizado!' : 'Produto cadastrado!');
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (e) {
      showError('Erro ao salvar produto.');
    }
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      price: p.price.toString(),
      sku: p.sku || '',
      image_url: p.image_url,
      product_url: p.product_url,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Produto?',
      description: `Deseja remover o produto "${name}"?`,
      onConfirm: async () => {
        await db.products.delete(id);
        showSuccess('Produto removido.');
        setDialog(p => ({ ...p, isOpen: false }));
        loadData();
      },
      onCancel: () => setDialog(p => ({ ...p, isOpen: false }))
    });
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Produtos</h1>
          <p className="text-[#64748B] font-medium mt-1">Vincule os produtos da sua loja aos CTAs dos stories.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-white border border-[#E2E8F0] text-[#64748B] px-6 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 hover:bg-slate-50"
          >
            Importar
          </button>
          <button 
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[1.5rem] p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0094EB]/10 font-medium"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[1.5rem] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-[#64748B]">Produto</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-[#64748B]">Preço</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-[#64748B]">SKU</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-[#64748B] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image_url} className="h-10 w-10 rounded-lg object-cover bg-slate-100" alt={p.name} />
                    <span className="font-bold text-[#0F172A]">{p.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-[#0094EB]">R$ {p.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-[#64748B] font-mono text-xs">{p.sku || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 text-[#64748B] hover:text-[#0094EB] transition-colors"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-[#64748B] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-[#64748B] font-bold">Nenhum produto encontrado.</div>
        )}
      </div>

      {/* Modal Adicionar/Editar Produto */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-50">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h3>
            
            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Nome do Produto</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Preço (R$)</label>
                  <input 
                    type="number" step="0.01" required
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">SKU</label>
                  <input 
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Link da Imagem</label>
                <input 
                  type="url"
                  value={formData.image_url}
                  onChange={e => setFormData({...formData, image_url: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">Página de Vendas (URL)</label>
                <input 
                  type="url" required
                  value={formData.product_url}
                  onChange={e => setFormData({...formData, product_url: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-[#0094EB] text-white font-bold text-sm hover:bg-[#0E4787] shadow-lg">Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importação */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setIsImportModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-50">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">Importar Produtos</h3>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
               {[
                 { id: 'xml', label: 'XML/Feed', icon: FileCode },
                 { id: 'integration', label: 'API/Plataforma', icon: Globe },
                 { id: 'spreadsheet', label: 'Planilha', icon: FileSpreadsheet },
               ].map(item => (
                 <button
                    key={item.id}
                    onClick={() => setImportType(item.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center",
                      importType === item.id ? "bg-blue-50 border-[#0094EB] text-[#0094EB]" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                    )}
                 >
                    <item.icon size={24} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                 </button>
               ))}
            </div>

            <div className="space-y-4">
               {importType === 'xml' && (
                 <div>
                   <label className="block text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2">URL do Feed XML (Google Shopping/Facebook)</label>
                   <input type="url" placeholder="https://..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0094EB]" />
                 </div>
               )}
               {importType === 'integration' && (
                 <div className="bg-slate-50 p-6 rounded-2xl text-center">
                    <p className="text-sm font-bold text-slate-500">Selecione sua plataforma para conectar o catálogo automaticamente.</p>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                       <button className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">Shopify</button>
                       <button className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">Yampi</button>
                    </div>
                 </div>
               )}
               {importType === 'spreadsheet' && (
                 <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                    <Upload size={32} className="text-[#0094EB] mb-2" />
                    <span className="text-xs font-bold text-slate-500">Selecionar arquivo .CSV ou .XLSX</span>
                    <input type="file" accept=".csv, .xlsx" className="hidden" />
                 </label>
               )}
            </div>

            <div className="flex gap-3 pt-8">
              <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm">Cancelar</button>
              <button onClick={() => { showSuccess('Iniciando importação...'); setIsImportModalOpen(false); }} className="flex-1 py-3.5 rounded-2xl bg-[#0094EB] text-white font-bold text-sm hover:bg-[#0E4787]">Iniciar Importação</button>
            </div>
          </div>
        </div>
      )}

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </div>
  );
};

export default ProductsPage;