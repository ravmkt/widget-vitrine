"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { db, Product, Video } from '@/lib/db';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye,
  Package,
  Tag,
  Upload,
  FileSpreadsheet,
  Globe,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Image,
  Link2,
  AlertCircle,
  Download,
  Settings,
  ExternalLink,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS E MOCK DATA
// ============================================

interface Category {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

interface ProductWithRelations extends Product {
  category_name?: string;
  video_title?: string;
  video_id?: string;
  origin: 'manual' | 'integration';
}

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Vestidos', active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'cat2', name: 'Blusas', active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'cat3', name: 'Calças', active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'cat4', name: 'Acessórios', active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'cat5', name: 'Sapatos', active: false, created_at: '2024-01-15T10:00:00Z' },
];

const MOCK_VIDEOS: Video[] = [
  { id: 'vid1', store_id: '1', title: 'Coleção Verão 2024', source_type: 'upload', video_url: 'https://example.com/video1.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1?w=200', status: 'active', created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z' },
  { id: 'vid2', store_id: '1', title: 'Lookbook Outono', source_type: 'instagram', video_url: 'https://instagram.com/reel/abc', thumbnail_url: 'https://images.unsplash.com/photo-2?w=200', status: 'active', created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z' },
  { id: 'vid3', store_id: '1', title: 'Tutorial de Uso', source_type: 'tiktok', video_url: 'https://tiktok.com/@user/video/123', thumbnail_url: 'https://images.unsplash.com/photo-3?w=200', status: 'active', created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z' },
];

const MOCK_PRODUCTS: ProductWithRelations[] = [
  { id: 'prod1', store_id: '1', name: 'Vestido Floral Longo', image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200', product_url: 'https://loja.com/produto/vestido-floral', price: 189.90, sku: 'VF-001', short_description: 'Vestido longo estampa floral', active: true, created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', category_name: 'Vestidos', video_title: 'Coleção Verão 2024', video_id: 'vid1', origin: 'manual' },
  { id: 'prod2', store_id: '1', name: 'Blusa Básica Branca', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', product_url: 'https://loja.com/produto/blusa-basica', price: 79.90, sku: 'BB-002', short_description: 'Blusa 100% algodão', active: true, created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', category_name: 'Blusas', video_title: 'Lookbook Outono', video_id: 'vid2', origin: 'integration' },
  { id: 'prod3', store_id: '1', name: 'Calça Jeans Skinny', image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200', product_url: 'https://loja.com/produto/calca-jeans', price: 149.90, sku: 'CJ-003', short_description: 'Jeans stretch azul escuro', active: false, created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', category_name: 'Calças', video_title: undefined, video_id: undefined, origin: 'manual' },
  { id: 'prod4', store_id: '1', name: 'Bolsa Couro Marrom', image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200', product_url: 'https://loja.com/produto/bolsa-couro', price: 299.90, sku: 'BC-004', short_description: 'Bolsa de couro legítimo', active: true, created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', category_name: 'Acessórios', video_title: 'Tutorial de Uso', video_id: 'vid3', origin: 'integration' },
  { id: 'prod5', store_id: '1', name: 'Tênis Branco Casual', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200', product_url: 'https://loja.com/produto/tenis-branco', price: 249.90, sku: 'TB-005', short_description: 'Tênis confortável para dia a dia', active: true, created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', category_name: 'Sapatos', video_title: undefined, video_id: undefined, origin: 'manual' },
];

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
    active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
  )}>
    {active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
    {active ? 'Ativo' : 'Desativado'}
  </span>
);

const OriginBadge = ({ origin }: { origin: 'manual' | 'integration' }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
    origin === 'manual' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-violet-50 text-violet-600 border border-violet-100"
  )}>
    {origin === 'manual' ? <Tag size={10} /> : <Globe size={10} />}
    {origin === 'manual' ? 'Manual' : 'Integração'}
  </span>
);

const ActionButton = ({ onClick, children, variant = 'default', disabled, className = '', ...props }: any) => {
  const variants = {
    default: 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200',
    primary: 'bg-[#0094EB] text-white hover:bg-[#0E4787]',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200',
    ghost: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================
// MODAL DE CATEGORIAS
// ============================================

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (categories: Category[]) => void;
}

const CategoriesModal: React.FC<CategoriesModalProps> = ({ isOpen, onClose, categories, onSave }) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleAdd = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      active: true,
      created_at: new Date().toISOString(),
    };
    setLocalCategories([...localCategories, newCat]);
    setNewCategoryName('');
  };

  const handleEditStart = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleEditSave = (id: string) => {
    if (!editName.trim()) return;
    setLocalCategories(localCategories.map(c => c.id === id ? { ...c, name: editName.trim() } : c));
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      setLocalCategories(localCategories.filter(c => c.id !== id));
    }
  };

  const handleSaveAll = () => {
    onSave(localCategories);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900">Gerenciar Categorias</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={20} /></button>
        </div>
        
        <div className="p-6 border-b border-slate-100 flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nova categoria..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
          />
          <ActionButton onClick={handleAdd} variant="primary"><Plus size={16} /> Adicionar</ActionButton>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {localCategories.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhuma categoria cadastrada.</p>
          ) : (
            localCategories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                {editingId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditSave(cat.id)}
                      onBlur={() => handleEditSave(cat.id)}
                      autoFocus
                      className="flex-1 px-3 py-2 bg-white border border-[#0094EB] rounded-lg text-sm font-bold outline-none"
                    />
                    <ActionButton onClick={() => handleEditSave(cat.id)} variant="primary" size="sm"><CheckCircle2 size={14} /></ActionButton>
                    <ActionButton onClick={() => setEditingId(null)} variant="ghost" size="sm"><X size={14} /></ActionButton>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <StatusBadge active={cat.active} />
                      <span className="font-bold text-slate-800">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ActionButton onClick={() => handleEditStart(cat)} variant="ghost" size="sm"><Edit3 size={14} /></ActionButton>
                      <ActionButton onClick={() => handleDelete(cat.id)} variant="danger" size="sm"><Trash2 size={14} /></ActionButton>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-[2rem]">
          <ActionButton onClick={onClose} variant="default">Cancelar</ActionButton>
          <ActionButton onClick={handleSaveAll} variant="primary"><Save size={16} /> Salvar Alterações</ActionButton>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MODAL DE IMPORTAÇÃO
// ============================================

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'xml' | 'api' | 'spreadsheet'>('xml');
  const [xmlUrl, setXmlUrl] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [yampiToken, setYampiToken] = useState('');
  const [yampiUrl, setYampiUrl] = useState('');
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);

  const handleXmlImport = () => {
    if (!xmlUrl && !xmlFile) {
      showError('Informe a URL do XML ou selecione um arquivo.');
      return;
    }
    showSuccess('Importação via XML iniciada! (Simulação)');
    onClose();
  };

  const handleApiImport = () => {
    if (!yampiToken || !yampiUrl) {
      showError('Preencha o token e a URL da loja Yampi.');
      return;
    }
    showSuccess('Importação via API Yampi iniciada! (Simulação)');
    onClose();
  };

  const handleSpreadsheetImport = () => {
    if (!spreadsheetFile) {
      showError('Selecione um arquivo de planilha.');
      return;
    }
    showSuccess('Importação via planilha iniciada! (Simulação)');
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = 'nome,categoria,preco,link,sku,descricao\n"Vestido Floral","Vestidos",189.90,"https://loja.com/produto","VF-001","Vestido longo estampa floral"\n"Blusa Básica","Blusas",79.90,"https://loja.com/produto","BB-002","Blusa 100% algodão"';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo-produtos.csv';
    link.click();
    showSuccess('Modelo de planilha baixado!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900">Importar Produtos</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="flex border-b border-slate-100 px-6">
          {['xml', 'api', 'spreadsheet'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "py-4 px-6 text-sm font-black uppercase tracking-wider border-b-2 transition-all",
                activeTab === tab ? "border-[#0094EB] text-[#0094EB]" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              {tab === 'xml' && <><FileSpreadsheet className="inline mr-1" size={14} /> XML</>}
              {tab === 'api' && <><Globe className="inline mr-1" size={14} /> API</>}
              {tab === 'spreadsheet' && <><FileSpreadsheet className="inline mr-1" size={14} /> Planilha</>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* XML Tab */}
          {activeTab === 'xml' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="font-black text-blue-800 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Como importar via XML</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Forneça a URL do feed XML dos produtos ou faça upload do arquivo .xml</li>
                  <li>O XML deve conter: nome, categoria, preço, link, SKU, descrição, imagem</li>
                  <li>Produtos existentes serão atualizados pelo SKU; novos serão criados</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">URL do XML</label>
                  <input type="url" value={xmlUrl} onChange={e => setXmlUrl(e.target.value)} placeholder="https://exemplo.com/feed.xml" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ou faça upload do arquivo XML</label>
                  <input type="file" accept=".xml" onChange={e => setXmlFile(e.target.files?.[0] || null)} className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black" />
                  {xmlFile && <p className="text-xs text-slate-500 mt-1">Arquivo: {xmlFile.name} ({(xmlFile.size/1024).toFixed(1)} KB)</p>}
                </div>
              </div>
              <ActionButton onClick={handleXmlImport} variant="primary" className="w-full"><Upload size={16} /> Importar via XML</ActionButton>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
                <h4 className="font-black text-violet-800 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Integração via API</h4>
                <p className="text-sm text-violet-700">Conecte diretamente com a plataforma da sua loja para sincronizar produtos automaticamente.</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                      <h5 className="font-black text-slate-800">Yampi</h5>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Disponível</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Token/Chave de API</label>
                      <input type="password" value={yampiToken} onChange={e => setYampiToken(e.target.value)} placeholder="Sua chave de API Yampi" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">URL/Base da Loja</label>
                      <input type="url" value={yampiUrl} onChange={e => setYampiUrl(e.target.value)} placeholder="https://sualoja.yampi.com.br" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]" />
                    </div>
                  </div>
                  <ActionButton onClick={handleApiImport} variant="primary" className="w-full mt-2"><Globe size={16} /> Importar da Yampi</ActionButton>
                </div>

                {['Shopify', 'Nuvemshop'].map(platform => (
                  <div key={platform} className="p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center"><Settings className="w-5 h-5 text-slate-400" /></div>
                      <div>
                        <h5 className="font-black text-slate-500">{platform}</h5>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Em breve</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">Integração com {platform} estará disponível em futuras atualizações.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spreadsheet Tab */}
          {activeTab === 'spreadsheet' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <h4 className="font-black text-amber-800 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Importação via Planilha</h4>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>Baixe o modelo de planilha abaixo</li>
                  <li>Preencha com os dados dos produtos (nome, categoria, preço, link, SKU, descrição)</li>
                  <li>Faça upload do arquivo .xlsx ou .csv preenchido</li>
                  <li>Colunas obrigatórias: nome, categoria, preço, link</li>
                </ul>
              </div>
              <div className="space-y-4">
                <ActionButton onClick={downloadTemplate} variant="default" className="w-full"><Download size={16} /> Baixar Modelo (CSV)</ActionButton>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Upload da Planilha</label>
                  <input type="file" accept=".xlsx,.csv" onChange={e => setSpreadsheetFile(e.target.files?.[0] || null)} className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black" />
                  {spreadsheetFile && <p className="text-xs text-slate-500 mt-1">Arquivo: {spreadsheetFile.name} ({(spreadsheetFile.size/1024).toFixed(1)} KB)</p>}
                </div>
              </div>
              <ActionButton onClick={handleSpreadsheetImport} variant="primary" className="w-full"><Upload size={16} /> Importar Planilha</ActionButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MODAL DE PRODUTO (NOVO/EDITAR)
// ============================================

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithRelations | null;
  categories: Category[];
  onSave: (product: Partial<ProductWithRelations> & { image_file?: File }) => void;
  isSaving: boolean;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, product, categories, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    product_url: '',
    active: true,
    image_url: '',
    image_file: null as File | null,
    image_error: '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category_id: categories.find(c => c.name === product.category_name)?.id || '',
        price: product.price.toString(),
        product_url: product.product_url,
        active: product.active,
        image_url: product.image_url,
        image_file: null,
        image_error: '',
      });
    } else {
      setFormData({
        name: '',
        category_id: '',
        price: '',
        product_url: '',
        active: true,
        image_url: '',
        image_file: null,
        image_error: '',
      });
    }
  }, [product, categories]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 350 * 1024; // 350 KB
    if (file.size > MAX_SIZE) {
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

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Nome do produto é obrigatório.');
    if (!formData.category_id) errors.push('Categoria é obrigatória.');
    if (!formData.price || parseFloat(formData.price) <= 0) errors.push('Preço válido é obrigatório.');
    if (!formData.product_url.trim()) errors.push('Link do produto é obrigatório.');
    if (formData.image_error) errors.push(formData.image_error);
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(showError);
      return;
    }
    onSave({
      ...formData,
      price: parseFloat(formData.price),
      category_name: categories.find(c => c.id === formData.category_id)?.name,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Image Upload */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto do Produto (máx. 350 KB)</label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                {formData.image_url ? (
                  <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <Image className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleImageUpload} 
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                />
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
            <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]">
              <option value="">Selecione uma categoria</option>
              {categories.filter(c => c.active).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
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

          {product && (
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
          <ActionButton type="button" onClick={onClose} variant="default">Cancelar</ActionButton>
          <ActionButton type="submit" form={product ? undefined : 'product-form'} variant="primary" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CONFIRM DELETE DIALOG
// ============================================

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isLoading?: boolean;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({ isOpen, onClose, onConfirm, itemName, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  const isConfirmed = inputValue === 'excluir';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">Excluir Produto</h3>
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-800">
          Esta ação é irreversível. O produto <span className="font-black">"{itemName}"</span> será removido permanentemente.
        </div>
        <div className="mb-6">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Para confirmar, digite <span className="text-rose-500 underline">excluir</span>:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Digite excluir"
            autoFocus
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <ActionButton onClick={onClose} variant="default">Cancelar</ActionButton>
          <ActionButton 
            onClick={isConfirmed ? onConfirm : undefined} 
            variant="danger" 
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            Excluir definitivamente
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PÁGINA PRINCIPAL DE PRODUTOS
// ============================================

const ProductsPage = () => {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'manual' | 'integration'>('all');
  const [filterVideo, setFilterVideo] = useState<'all' | 'with' | 'without'>('all');

  // Modais
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; product: ProductWithRelations | null }>({ isOpen: false, product: null });

  // Carregar dados mockados
  useEffect(() => {
    const loadData = async () => {
      try {
        // Simular carregamento
        await new Promise(r => setTimeout(r, 300));
        setProducts(MOCK_PRODUCTS);
        setCategories(MOCK_CATEGORIES);
        setVideos(MOCK_VIDEOS);
      } catch (e) {
        showError('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || categories.find(c => c.id === filterCategory)?.name === p.category_name;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.active : !p.active);
      const matchesOrigin = filterOrigin === 'all' || p.origin === filterOrigin;
      const matchesVideo = filterVideo === 'all' || (filterVideo === 'with' ? !!p.video_id : !p.video_id);
      return matchesSearch && matchesCategory && matchesStatus && matchesOrigin && matchesVideo;
    });
  }, [products, categories, searchTerm, filterCategory, filterStatus, filterOrigin, filterVideo]);

  const handleToggleStatus = (product: ProductWithRelations) => {
    const updated = { ...product, active: !product.active };
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
    showSuccess(`Produto ${updated.active ? 'ativado' : 'desativado'} com sucesso.`);
  };

  const handleEdit = (product: ProductWithRelations) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteClick = (product: ProductWithRelations) => {
    setDeleteConfirm({ isOpen: true, product });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm.product) return;
    setProducts(prev => prev.filter(p => p.id !== deleteConfirm.product!.id));
    showSuccess('Produto removido permanentemente.');
    setDeleteConfirm({ isOpen: false, product: null });
  };

  const handleSaveProduct = (data: Partial<ProductWithRelations> & { image_file?: File }) => {
    setIsSaving(true);
    setTimeout(() => {
      if (editingProduct) {
        const updated = { ...editingProduct, ...data, updated_at: new Date().toISOString() };
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        showSuccess('Produto atualizado com sucesso!');
      } else {
        const newProduct: ProductWithRelations = {
          id: `prod-${Date.now()}`,
          store_id: '1',
          name: data.name!,
          image_url: data.image_url || '',
          product_url: data.product_url!,
          price: data.price!,
          sku: `SKU-${Date.now()}`,
          short_description: '',
          active: data.active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_name: data.category_name,
          video_title: undefined,
          video_id: undefined,
          origin: 'manual',
        };
        setProducts(prev => [newProduct, ...prev]);
        showSuccess('Produto criado com sucesso!');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setIsSaving(false);
    }, 500);
  };

  const handleOpenVideo = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      window.open(video.video_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie o catálogo de produtos da sua loja.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => setShowCategoriesModal(true)} variant="default">
            <Tag size={16} /> Categorias
          </ActionButton>
          <ActionButton onClick={() => setShowImportModal(true)} variant="default">
            <Upload size={16} /> Importar
          </ActionButton>
          <ActionButton onClick={() => { setEditingProduct(null); setShowProductModal(true); }} variant="primary">
            <Plus size={16} /> Novo Produto
          </ActionButton>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todas Categorias</option>
            {categories.filter(c => c.active).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
          </select>
          <select value={filterOrigin} onChange={e => setFilterOrigin(e.target.value as any)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Todas Origens</option>
            <option value="manual">Manual</option>
            <option value="integration">Integração</option>
          </select>
          <select value={filterVideo} onChange={e => setFilterVideo(e.target.value as any)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]">
            <option value="all">Vídeo Vinculado</option>
            <option value="with">Com Vídeo</option>
            <option value="without">Sem Vídeo</option>
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
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
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                      onError={e => { e.currentTarget.src = 'https://via.placeholder.com/48'; }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 truncate max-w-xs">{product.name}</p>
                    {product.sku && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SKU: {product.sku}</p>}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">
                    {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100">
                      <Tag size={12} /> {product.category_name || 'Sem categoria'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.video_id && product.video_title ? (
                      <button
                        onClick={() => handleOpenVideo(product.video_id!)}
                        className="flex items-center gap-1.5 text-[#0094EB] hover:underline text-sm font-bold"
                        title="Abrir vídeo"
                      >
                        <PlayCircle size={14} /> {product.video_title}
                      </button>
                    ) : (
                      <span className="text-slate-400 text-sm italic">Nenhum vídeo vinculado</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <OriginBadge origin={product.origin} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge active={product.active} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionButton onClick={() => handleEdit(product)} variant="ghost" size="sm" title="Editar"><Edit3 size={14} /></ActionButton>
                      <ActionButton onClick={() => handleDeleteClick(product)} variant="danger" size="sm" title="Excluir"><Trash2 size={14} /></ActionButton>
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

      {/* Modais */}
      <CategoriesModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        categories={categories}
        onSave={setCategories}
      />
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        product={editingProduct}
        categories={categories}
        onSave={handleSaveProduct}
        isSaving={isSaving}
      />
      <ConfirmDeleteDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, product: null })}
        onConfirm={handleConfirmDelete}
        itemName={deleteConfirm.product?.name || ''}
      />
    </div>
  );
};

export default ProductsPage;