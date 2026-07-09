import React, { useEffect, useState } from 'react';
import { db, Product } from '@/lib/db';
import { Plus, ShoppingBag, Search, Edit3, Trash2, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false, id: '', name: ''
  });

  const [formData, setFormData] = useState({
    name: '', price: '', sku: '', image_url: '', product_url: '',
  });

  const loadData = async () => {
    const all = await db.products.getAll();
    setProducts(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
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
      setShowSuccess(true);
    } catch (e) {
      showError('Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveFinished = () => {
    setShowSuccess(false);
    setIsAddModalOpen(false);
    loadData();
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produtos</h1>
        <button onClick={() => { setEditingProduct(null); setFormData({name: '', price: '', sku: '', image_url: '', product_url: ''}); setIsAddModalOpen(true); }} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500">Produto</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-800">{p.name}</td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => { setEditingProduct(p); setFormData({name: p.name, price: p.price.toString(), sku: p.sku||'', image_url: p.image_url, product_url: p.product_url}); setIsAddModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#0094EB]"><Edit3 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomDialog isOpen={isAddModalOpen} type="form" title={editingProduct ? 'Editar Produto' : 'Novo Produto'} onCancel={() => setIsAddModalOpen(false)} onConfirm={handleSave} confirmText={isSaving ? "Salvando..." : "Salvar"}>
        <div className="space-y-4">
           <input type="text" placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
           <input type="number" placeholder="Preço" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
        </div>
      </CustomDialog>

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="Excluir Produto" itemName={deleteModal.name} onConfirm={() => db.products.delete(deleteModal.id).then(loadData)} onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} />
      <SuccessDialog isOpen={showSuccess} description="Produto salvo com sucesso." onClose={onSaveFinished} />
    </div>
  );
};

export default ProductsPage;