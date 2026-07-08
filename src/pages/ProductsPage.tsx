import React, { useEffect, useState, useMemo, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { db, Product, Store, StoryProduct, Story } from '@/lib/db';
import { Link } from 'react-router-dom';
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
  X,
  FileSpreadsheet,
  Code,
  Globe,
  Settings,
  AlertCircle,
  Upload,
  Check,
  RefreshCw,
  EyeOff,
  Database
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

interface TempImportItem {
  id: string;
  name: string;
  product_url: string;
  image_url: string;
  price: number;
  sku: string;
  short_description?: string;
  status: 'new' | 'duplicate';
}

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

  // Import flow handling
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importTab, setImportTab] = useState<'yampi' | 'spreadsheet' | 'xml'>('yampi');
  const [tempImportList, setTempImportList] = useState<TempImportItem[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());

  // Yampi Credentials States (Pre-populated from .env if available)
  const [yampiAlias, setYampiAlias] = useState(import.meta.env.VITE_YAMPI_ALIAS || '');
  const [yampiToken, setYampiToken] = useState(import.meta.env.VITE_YAMPI_API_TOKEN || '');
  const [yampiSecret, setYampiSecret] = useState(import.meta.env.VITE_YAMPI_SECRET_KEY || '');
  const [showYampiSecret, setShowYampiSecret] = useState(false);
  const [isYampiConnecting, setIsYampiConnecting] = useState(false);

  // XML Feed Url Input
  const [xmlUrl, setXmlUrl] = useState('');
  const [isXmlLoading, setIsXmlLoading] = useState(false);

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
      const nameNorm = String(p.name ?? '').toLowerCase();
      const skuNorm = String(p.sku ?? '').toLowerCase();
      const urlNorm = String(p.product_url ?? '').toLowerCase();
      const searchNorm = searchTerm.toLowerCase();

      const matchesSearch =
        nameNorm.includes(searchNorm) ||
        skuNorm.includes(searchNorm) ||
        urlNorm.includes(searchNorm);

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
    setShowImportPanel(false);
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
    setShowImportPanel(false);
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

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('A imagem do produto deve ter no máximo 2MB.');
        return;
      }
      
      const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedFormats.includes(file.type)) {
        showError('Formato inválido. Envie uma foto em JPG, PNG ou WEBP.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result as string }));
        showSuccess('Imagem carregada! Não se esqueça de salvar o produto.');
      };
      reader.readAsDataURL(file);
    }
  };

  const mapAndCheckDuplicates = (rawItems: Omit<TempImportItem, 'id' | 'status'>[]): TempImportItem[] => {
    return rawItems.map((item) => {
      const isDuplicate = products.some(
        (p) => 
          (p.sku && item.sku && p.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()) || 
          (p.product_url.toLowerCase().trim() === item.product_url.toLowerCase().trim())
      );
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        status: isDuplicate ? 'duplicate' : 'new'
      };
    });
  };

  const handleConnectYampi = async () => {
    if (!yampiAlias.trim() || !yampiToken.trim() || !yampiSecret.trim()) {
      showError('Por favor, preencha todas as credenciais da Yampi.');
      return;
    }

    setIsYampiConnecting(true);
    setTempImportList([]);

    const yampiApiUrl = `https://api.dooki.com.br/v2/products`;
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yampiApiUrl)}`;

    try {
      const response = await fetch(corsProxyUrl, {
        method: 'GET',
        headers: {
          'User-Token': yampiToken.trim(),
          'User-Secret': yampiSecret.trim(),
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('AUTH_ERROR');
        throw new Error('NETWORK_ERROR');
      }

      const json = await response.json();
      const rawProducts = json.data || [];

      if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
        showError('Nenhum produto foi localizado nesta conta da Yampi.');
        setIsYampiConnecting(false);
        return;
      }

      const mappedProducts = rawProducts.map((p: any) => {
        const mainImageObj = p.images?.data?.find((img: any) => img.active) || p.images?.data?.[0];
        const imageUrl = mainImageObj?.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
        
        return {
          name: String(p.name || ''),
          product_url: p.url || `https://${yampiAlias}.yampi.store/produto/${p.slug || p.id}`,
          image_url: imageUrl,
          price: parseFloat(p.price_sale) || parseFloat(p.price) || 0,
          sku: String(p.sku || p.id),
          short_description: String(p.description_short || p.description || 'Produto importado via API Yampi.')
        };
      });

      const checked = mapAndCheckDuplicates(mappedProducts);
      setTempImportList(checked);
      setSelectedImportIds(new Set(checked.filter(x => x.status === 'new').map(x => x.id)));

      showSuccess(`Conexão estabelecida! Sincronizados ${checked.length} produtos.`);
    } catch (err: any) {
      showError(err.message === 'AUTH_ERROR' ? 'Falha na autenticação da Yampi.' : 'Não foi possível conectar à API da Yampi.');
    } finally {
      setIsYampiConnecting(false);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const lines = text.split('\n');
        if (lines.length < 2) {
          showError('A planilha CSV selecionada está vazia.');
          return;
        }
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        const nameIdx = headers.indexOf('nome');
        const urlIdx = headers.indexOf('url') !== -1 ? headers.indexOf('url') : headers.indexOf('link');
        const imgIdx = headers.indexOf('imagem') !== -1 ? headers.indexOf('imagem') : headers.indexOf('foto');
        const priceIdx = headers.indexOf('preco') !== -1 ? headers.indexOf('preco') : headers.indexOf('preço');
        const skuIdx = headers.indexOf('sku');

        if (nameIdx === -1 || urlIdx === -1) {
          showError('A planilha CSV precisa conter ao menos as colunas "nome" e "url".');
          return;
        }

        const parsedRaw: Omit<TempImportItem, 'id' | 'status'>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
          const name = columns[nameIdx];
          const product_url = columns[urlIdx];
          if (!name || !product_url) continue;
          const image_url = imgIdx !== -1 && columns[imgIdx] ? columns[imgIdx] : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
          const price = priceIdx !== -1 && parseFloat(columns[priceIdx]) ? parseFloat(columns[priceIdx]) : 0;
          const sku = skuIdx !== -1 && columns[skuIdx] ? columns[skuIdx] : `CSV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          parsedRaw.push({ name, product_url, image_url, price, sku, short_description: 'Produto importado via planilha CSV.' });
        }
        const mapped = mapAndCheckDuplicates(parsedRaw);
        setTempImportList(mapped);
        setSelectedImportIds(new Set(mapped.filter(x => x.status === 'new').map(x => x.id)));
        showSuccess(`Planilha carregada com sucesso!`);
      } catch (err) {
        showError('Erro ao interpretar o arquivo CSV.');
      }
    };
    reader.readAsText(file);
  };

  const handleXMLParsing = (xmlText: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const nodes = xmlDoc.getElementsByTagName('item').length > 0 ? xmlDoc.getElementsByTagName('item') : xmlDoc.getElementsByTagName('entry');

      if (nodes.length === 0) {
        showError('Nenhum produto compatível com XML Merchant foi identificado.');
        return;
      }

      const parsedRaw: Omit<TempImportItem, 'id' | 'status'>[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const name = node.getElementsByTagName('title')?.[0]?.textContent || node.getElementsByTagName('g:title')?.[0]?.textContent || '';
        const product_url = node.getElementsByTagName('link')?.[0]?.textContent || node.getElementsByTagName('g:link')?.[0]?.textContent || '';
        if (!name || !product_url) continue;
        const image_url = node.getElementsByTagName('g:image_link')?.[0]?.textContent || node.getElementsByTagName('image')?.[0]?.textContent || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
        const rawPrice = node.getElementsByTagName('g:price')?.[0]?.textContent || node.getElementsByTagName('price')?.[0]?.textContent || '0';
        const price = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0;
        const sku = node.getElementsByTagName('g:id')?.[0]?.textContent || node.getElementsByTagName('sku')?.[0]?.textContent || `XML-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        parsedRaw.push({ name, product_url, image_url, price, sku, short_description: 'Produto importado via Feed XML.' });
      }
      const mapped = mapAndCheckDuplicates(parsedRaw);
      setTempImportList(mapped);
      setSelectedImportIds(new Set(mapped.filter(x => x.status === 'new').map(x => x.id)));
      showSuccess(`XML carregado com sucesso!`);
    } catch (e) {
      showError('Erro ao interpretar XML.');
    }
  };

  const handleFetchXMLUrl = async () => {
    if (!xmlUrl.trim()) {
      showError('Por favor, informe a URL do feed XML.');
      return;
    }
    setIsXmlLoading(true);
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(xmlUrl.trim())}`;
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network fail');
      const text = await response.text();
      handleXMLParsing(text);
    } catch (e) {
      showError('Erro ao buscar o arquivo XML.');
    } finally {
      setIsXmlLoading(false);
    }
  };

  const handleImportExecute = async () => {
    if (selectedImportIds.size === 0 || !store) return;
    try {
      const itemsToImport = tempImportList.filter(x => selectedImportIds.has(x.id));
      for (const item of itemsToImport) {
        await db.products.save({ id: Math.random().toString(36).substr(2, 9), store_id: store.id, name: item.name, product_url: item.product_url, image_url: item.image_url, price: item.price, sku: item.sku, short_description: item.short_description, active: true });
      }
      showSuccess(`Sucesso! ${itemsToImport.length} produtos importados.`);
      setTempImportList([]);
      setSelectedImportIds(new Set());
      setShowImportPanel(false);
      loadProductsList();
    } catch (e) {
      showError('Erro ao registrar os produtos importados.');
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
              Cadastre, integre ou importe os produtos da sua loja para vinculá-los às chamadas de ação dos stories em vídeo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {!showForm && !showImportPanel && (
              <>
                <button
                  onClick={() => setShowImportPanel(true)}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 px-5 py-3 rounded-2xl font-bold text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-violet-400" />
                  Importar Produtos
                </button>

                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-3 rounded-2xl font-bold text-sm md:text-base shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar produto
                </button>
              </>
            )}
          </div>
        </div>

        {showImportPanel && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold">Importação Automatizada de Produtos</h3>
              </div>
              <button onClick={() => { setShowImportPanel(false); setTempImportList([]); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-800">
              {(['yampi', 'spreadsheet', 'xml'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setImportTab(tab); setTempImportList([]); }}
                  className={`flex items-center gap-2 px-5 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                    importTab === tab ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === 'yampi' ? <Globe className="w-4 h-4" /> : tab === 'spreadsheet' ? <FileSpreadsheet className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                  {tab === 'yampi' ? 'Yampi' : tab === 'spreadsheet' ? 'Planilha CSV' : 'Feed XML'}
                </button>
              ))}
            </div>

            {importTab === 'yampi' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Alias da Loja</label>
                    <input type="text" value={yampiAlias} onChange={(e) => setYampiAlias(e.target.value)} placeholder="Ex: use-anny3" className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Token API</label>
                    <input type="text" value={yampiToken} onChange={(e) => setYampiToken(e.target.value)} placeholder="Token..." className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Secret Key</label>
                    <div className="relative">
                      <input type={showYampiSecret ? 'text' : 'password'} value={yampiSecret} onChange={(e) => setYampiSecret(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-100 font-mono" />
                      <button type="button" onClick={() => setShowYampiSecret(!showYampiSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showYampiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={handleConnectYampi} disabled={isYampiConnecting} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md">
                  {isYampiConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Conectar e Importar
                </button>
              </div>
            )}

            {importTab === 'spreadsheet' && (
              <div className="p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950 text-center">
                <FileSpreadsheet className="w-10 h-10 text-slate-600 mb-2 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Escolha seu arquivo de planilha (.csv)</p>
                <label className="mt-4 cursor-pointer inline-block bg-slate-900 border border-slate-850 hover:border-violet-500 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
                  Selecionar Arquivo CSV
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>
            )}

            {importTab === 'xml' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input type="url" value={xmlUrl} onChange={(e) => setXmlUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-xs text-slate-200 font-mono" />
                  <button type="button" onClick={handleFetchXMLUrl} disabled={isXmlLoading} className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2">{isXmlLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Carregar Feed</button>
                </div>
              </div>
            )}

            {tempImportList.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800 animate-fade-in">
                <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 uppercase font-black text-[9px] tracking-wider">
                        <th className="p-3 w-[40px] text-center">Importar?</th>
                        <th className="p-3">Foto</th>
                        <th className="p-3">Produto / SKU</th>
                        <th className="p-3 text-right">Preço</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                      {tempImportList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40">
                          <td className="p-3 text-center"><input type="checkbox" disabled={item.status === 'duplicate'} checked={selectedImportIds.has(item.id)} onChange={() => { const newSet = new Set(selectedImportIds); if (newSet.has(item.id)) newSet.delete(item.id); else newSet.add(item.id); setSelectedImportIds(newSet); }} className="rounded border-slate-800 text-violet-600 focus:ring-violet-500/20 w-4 h-4 cursor-pointer" /></td>
                          <td className="p-3 w-[60px]"><img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-slate-900" /></td>
                          <td className="p-3"><p className="text-slate-100 font-bold truncate max-w-[280px]">{item.name}</p><p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.sku}</p></td>
                          <td className="p-3 text-right text-slate-200 font-mono font-bold">R$ {item.price.toFixed(2)}</td>
                          <td className="p-3 text-center">{item.status === 'duplicate' ? <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Duplicado</span> : <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Novo</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button type="button" onClick={handleImportExecute} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-md uppercase tracking-wider">Confirmar Importação de ({selectedImportIds.size}) Itens</button>
                </div>
              </div>
            )}
          </div>
        )}

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
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
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

                <div className="md:col-span-2 space-y-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Foto / Imagem do Produto
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                    <div className="w-[120px] h-[120px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative group">
                      {formData.image_url ? (
                        <>
                          <img src={formData.image_url} alt="Produto preview" className="w-full h-full object-contain p-2" />
                          <button type="button" onClick={() => setFormData({ ...formData, image_url: '' })} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-opacity font-bold text-xs gap-1.5"><Trash2 className="w-4 h-4" /> Remover</button>
                        </>
                      ) : (
                        <div className="text-center p-3"><ShoppingBag className="w-8 h-8 text-slate-650 mx-auto mb-1" /><span className="text-[10px] text-slate-500 font-bold block">Sem Imagem</span></div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-semibold">Selecione uma imagem do produto ou informe uma URL externa abaixo.</p>
                      <label className="cursor-pointer inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md">
                        <Upload className="w-4 h-4" /> Enviar Imagem
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProductImageUpload} className="hidden" />
                      </label>
                      <input type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-violet-500 rounded-xl text-xs font-mono text-slate-300" placeholder="https://..." />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição Curta</label>
                  <textarea value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} rows={3} className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-700" placeholder="Características deste produto..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-semibold text-sm">Cancelar</button>
                <button type="submit" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm">{editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Buscar por nome, SKU ou link do produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl text-sm font-semibold text-slate-200" />
          </div>
          <div className="w-full md:w-auto min-w-[200px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full bg-transparent border-none text-xs md:text-sm font-bold text-slate-300 py-1.5"><option value="all">Todos os status</option><option value="active">Apenas ativos</option><option value="inactive">Apenas inativos</option></select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto"><ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" /><h3 className="text-xl font-bold text-slate-200">Nenhum produto correspondente</h3></div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead><tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] md:text-xs tracking-wider"><th className="p-4 pl-6 w-[80px]">Imagem</th><th className="p-4">Nome / Descrição</th><th className="p-4 text-center">Preço</th><th className="p-4">SKU</th><th className="p-4 text-center">Stories</th><th className="p-4 text-center">Status</th><th className="p-4 pr-6 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {filteredProducts.map((p) => {
                    const relationsCount = productRelationsCountMap.get(p.id) || 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-all group">
                        <td className="p-4 pl-6"><div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800"><img src={appImageOrFallback(p.image_url)} alt={p.name} className="w-full h-full object-cover" /></div></td>
                        <td className="p-4 max-w-[220px]"><p className="font-bold text-slate-200 text-sm truncate group-hover:text-violet-400 transition-colors">{p.name}</p><p className="text-[11px] text-slate-500 line-clamp-1">{p.short_description || 'Nenhuma descrição.'}</p></td>
                        <td className="p-4 text-center font-bold text-slate-100">R$ {p.price.toFixed(2)}</td>
                        <td className="p-4 font-mono text-slate-400">{p.sku || <span className="text-slate-700 italic">vazio</span>}</td>
                        <td className="p-4 text-center font-bold text-violet-400">{relationsCount}</td>
                        <td className="p-4 text-center"><span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${p.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{p.active ? 'Ativo' : 'Inativo'}</span></td>
                        <td className="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap"><button onClick={() => setSelectedMetricsProduct(p)} className="p-1.5 rounded-lg bg-slate-950 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"><LineChart className="w-4 h-4" /></button><button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg bg-slate-950 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 transition-all inline-flex items-center"><Edit3 className="w-4 h-4" /></button><button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedMetricsProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setSelectedMetricsProduct(null)} className="absolute top-4 right-4 p-1 rounded-full bg-slate-950 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            <div className="pb-3 border-b border-slate-800 mb-5 flex items-center gap-2"><LineChart className="w-5 h-5 text-violet-400" /><h3 className="font-extrabold text-lg text-slate-100">Métricas de Vendas</h3></div>
            <div className="flex gap-4 items-center mb-6 bg-slate-950/60 p-4 border border-slate-850 rounded-2xl">
              <img src={appImageOrFallback(selectedMetricsProduct.image_url)} alt={selectedMetricsProduct.name} className="w-16 h-16 rounded-xl object-cover" />
              <div className="min-w-0"><h4 className="font-extrabold text-slate-200 truncate">{selectedMetricsProduct.name}</h4><p className="text-xs text-slate-500 font-mono">SKU: {selectedMetricsProduct.sku || 'N/A'}</p><p className="text-sm font-bold text-violet-400">R$ {selectedMetricsProduct.price.toFixed(2)}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center"><span className="text-[10px] text-slate-500 font-bold uppercase block">Cliques</span><span className="text-lg font-black text-slate-200 mt-1 block">{(productStatsMap.get(selectedMetricsProduct.id)?.clicks || 0).toLocaleString()}</span></div>
              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center"><span className="text-[10px] font-bold text-slate-500 uppercase block">Checkouts</span><span className="text-lg font-black text-emerald-400 block mt-1">{(productStatsMap.get(selectedMetricsProduct.id)?.conversions || 0).toLocaleString()}</span></div>
              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center"><span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">CTR</span><span className="text-xs font-black bg-violet-600/10 text-violet-400 border border-violet-500/25 px-2.5 py-1 rounded-full block w-fit mx-auto">{productStatsMap.get(selectedMetricsProduct.id)?.ctr || '0.0%'}</span></div>
            </div>
          </div>
        </div>
      )}

      <CustomDialog isOpen={dialog.isOpen} type={dialog.type} title={dialog.title} description={dialog.description} onConfirm={dialog.onConfirm} onCancel={dialog.onCancel} confirmText="Confirmar" cancelText="Voltar" />
    </div>
  );
};

export default ProductsPage;