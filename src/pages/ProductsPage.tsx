import React, { useEffect, useState } from 'react';
import { db, Product } from '@/lib/db';
import { Plus, ShoppingBag, Search, ExternalLink, Trash2, Edit3, Package } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const loadData = async () => {
    const all = await db.products.getAll();
    setProducts(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddProduct = () => {
    showSuccess('Abrindo formulário de novo produto...');
  };

  const handleEdit = (p: Product) => {
    showSuccess(`Editando produto: ${p.name}`);
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Produtos</h1>
          <p className="text-[#64748B] font-medium mt-1">Vincule os produtos da sua loja aos CTAs dos stories.</p>
        </div>
        <button 
          onClick={handleAddProduct}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[1.5rem] p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0094EB]/10"
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
                    <button onClick={() => handleEdit(p)} className="p-2 text-[#64748B] hover:text-[#0094EB]"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-[#64748B] hover:text-red-500"><Trash2 size={16} /></button>
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