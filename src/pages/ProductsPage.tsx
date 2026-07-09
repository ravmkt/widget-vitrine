import React, { useEffect, useState } from 'react';
import { db, Product } from '@/lib/db';
import { Plus, ShoppingBag, Search, Edit3, Trash2, Upload, FileCode, Download, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'spreadsheet' | 'api'>('spreadsheet');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Product = {
      ...editingProduct,
      id: editingProduct?.id || Math.random().toString(36).substr(2, 9),
      store_id: '11111111-1111-1111-1111-111111111111',
      name: formData.name,
      price: Number(formData.price),
      sku: formData.sku,
      image_url: formData.image_url,
      product_url: formData.product_url,
      active: true,
    };
    await db.products.save(data);
    showSuccess('Produto salvo!');
    setIsAddModalOpen(false);
    loadData();
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteModal({
      isOpen: true,
      id: product.id,
      name: product.name
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.products.delete(deleteModal.id);
      showSuccess('Produto removido.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (e) {
      showError('Erro ao excluir produto.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({...formData, image_url: URL.createObjectURL(file)});
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie seu catálogo de produtos vinculados aos vídeos.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm shadow-sm transition-all flex items-center gap-2 hover:bg-slate-50">
            Importar
          </button>
          <button onClick={() => { setEditingProduct(null); setFormData({name: '', price: '', sku: '', image_url: '', product_url: ''}); setIsAddModalOpen(true); }} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2">
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Produto</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Preço</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">SKU</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                   <div className="flex items-center gap-4">
                      <img src={p.image_url} className="h-12 w-12 rounded-xl object-cover border border-slate-200" alt={p.name} />
                      <span className="font-bold text-slate-800">{p.name}</span>
                   </div>
                </td>
                <td className="px-8 py-5 text-[#0094EB] font-black">R$ {p.price.toFixed(2)}</td>
                <td className="px-8 py-5 text-slate-400 font-mono text-xs">{p.sku}</td>
                <td className="px-8 py-5 text-right">
                   <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingProduct(p); setFormData({name: p.name, price: p.price.toString(), sku: p.sku||'', image_url: p.image_url, product_url: p.product_url}); setIsAddModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-[#0094EB] transition-colors"><Edit3 size={18} /></button>
                      <button onClick={() => handleDeleteClick(p)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomDialog isOpen={isAddModalOpen} type="form" title={editingProduct ? 'Editar Produto' : 'Novo Produto'} maxWidth="max-w-xl" onCancel={() => setIsAddModalOpen(false)} onConfirm={handleSave}>
        <div className="space-y-8">
           <div className="flex flex-col sm:flex-row gap-6 items-center">
              <label className="h-24 w-24 rounded-[1.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:bg-blue-50 transition-all">
                 {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <Plus className="text-slate-300" />}
                 <input type="file" onChange={handleFileChange} className="hidden" />
              </label>
              <div className="flex-1 w-full space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
                 </div>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço (R$)</label>
                 <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU</label>
                 <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
              </div>
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página de Venda (URL)</label>
              <input type="url" value={formData.product_url} onChange={e => setFormData({...formData, product_url: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
           </div>
        </div>
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Produto"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ProductsPage;