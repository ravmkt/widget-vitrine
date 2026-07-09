import React, { useEffect, useState, useMemo } from 'react';
import { db, Product } from '@/lib/db';
import { Plus, ShoppingBag, Search, ExternalLink, Trash2, Edit3, X, Upload, FileSpreadsheet, Globe, FileCode, Download } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'spreadsheet' | 'api'>('spreadsheet');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({...formData, image_url: URL.createObjectURL(file)});
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
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
                   <button onClick={() => { setEditingProduct(p); setFormData({name: p.name, price: p.price.toString(), sku: p.sku||'', image_url: p.image_url, product_url: p.product_url}); setIsAddModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-[#0094EB] transition-colors"><Edit3 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Adicionar/Editar */}
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

      {/* Modal Importação */}
      <CustomDialog isOpen={isImportModalOpen} type="form" title="Importar Produtos" maxWidth="max-w-2xl" onCancel={() => setIsImportModalOpen(false)}>
        <div className="space-y-10">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-fit">
              <button onClick={() => setImportType('spreadsheet')} className={cn("px-6 py-2.5 rounded-xl text-xs font-black transition-all", importType === 'spreadsheet' ? "bg-white text-[#0094EB] shadow-sm" : "text-slate-400 hover:text-slate-600")}>Planilha</button>
              <button onClick={() => setImportType('api')} className={cn("px-6 py-2.5 rounded-xl text-xs font-black transition-all", importType === 'api' ? "bg-white text-[#0094EB] shadow-sm" : "text-slate-400 hover:text-slate-600")}>API / Plataforma</button>
           </div>

           {importType === 'spreadsheet' ? (
             <div className="space-y-8 animate-fade-in">
                <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <FileCode className="text-[#0094EB]" size={32} />
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">Modelo de Planilha</h4>
                        <p className="text-xs text-slate-500 font-bold">Baixe o modelo e preencha os dados.</p>
                      </div>
                   </div>
                   <button className="flex items-center gap-2 bg-white text-[#0094EB] px-5 py-2.5 rounded-xl text-xs font-black border border-blue-100 hover:bg-blue-100 transition-all shadow-sm">
                      <Download size={16} /> Baixar Modelo
                   </button>
                </div>
                <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all">
                   <Upload size={40} className="text-[#0094EB] mb-4" />
                   <span className="text-sm font-black text-slate-600">Fazer upload da planilha</span>
                   <span className="text-xs text-slate-400 mt-2">Arraste ou clique para selecionar (.csv, .xlsx)</span>
                   <input type="file" className="hidden" />
                </label>
                <button className="w-full py-4 bg-[#0094EB] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-[#0E4787]">Iniciar Importação</button>
             </div>
           ) : (
             <div className="space-y-6 animate-fade-in">
                {[
                  { id: 'yampi', label: 'Yampi', active: true, logo: 'https://yampi.com.br/favicon.ico' },
                  { id: 'shopify', label: 'Shopify', active: false, logo: 'https://shopify.com/favicon.ico' },
                  { id: 'nuvemshop', label: 'Nuvemshop', active: false, logo: 'https://nuvemshop.com.br/favicon.ico' },
                ].map(p => (
                  <div key={p.id} className={cn("p-6 rounded-[1.5rem] border flex items-center justify-between", p.active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60")}>
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl border border-slate-100 p-2 flex items-center justify-center"><Globe size={20} className="text-slate-300" /></div>
                        <span className="font-black text-slate-800">{p.label}</span>
                     </div>
                     {p.active ? (
                       <button className="bg-blue-50 text-[#0094EB] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">Configurar</button>
                     ) : (
                       <span className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Em Breve</span>
                     )}
                  </div>
                ))}
             </div>
           )}
        </div>
      </CustomDialog>
    </div>
  );
};

export default ProductsPage;