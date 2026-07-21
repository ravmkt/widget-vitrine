"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Tag,
  Upload,
  Search,
  Edit3,
  Trash2,
  X,
  Image,
  Loader2,
  Save,
  Globe,
  Package,
  ChevronUp,
  ChevronDown,
  FileText,
  Link,
} from 'lucide-react';

import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { db, Product, resolveStoreId, withStoreId, generateUuid } from '@/lib/db';

import { useTenant } from '@/context/TenantContext';

const ProductsPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();
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

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    productId: string;
    productTitle: string;
  }>({
    isOpen: false,
    productId: '',
    productTitle: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const resolvedStoreId = await resolveStoreId(storeId);
        const allProducts = await db.products.getAll(resolvedStoreId);
        setProducts(allProducts);
      } catch (e) {
        console.error('Erro ao carregar produtos:', e);
        showError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };

    if (!tenantLoading) {
      load();
    }
  }, [storeId, tenantLoading]);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || (p as any).category === filterCategory;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? (p as any).active : !(p as any).active);
      const matchesOrigin = filterOrigin === 'all' || (p as any).origin === filterOrigin;

      return matchesSearch && matchesCategory && matchesStatus && matchesOrigin;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterOrigin]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(dir => dir === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  const sortedProducts = useMemo(() => {
    const rows = [...filteredProducts];

    if (!sortColumn) return rows;

    const getValue = (p: Product) => {
      switch (sortColumn) {
        case 'produto':
          return p.name || '';
        case 'preco':
          return Number(p.price || 0);
        case 'categoria':
          return (p as any).category || '';
        case 'video':
          return ((p as any).video || '').toString() || '';
        case 'origem':
          return (p as any).origin || '';
        case 'status':
          return (p as any).active ? 'ATIVO' : 'DESATIVADO';
        default:
          return '';
      }
    };

    rows.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);

      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDirection === 'asc' ? va - vb : vb - va;
      }

      if (va === '' && vb !== '') return 1;
      if (vb === '' && va !== '') return -1;

      return sortDirection === 'asc'
        ? String(va).localeCompare(String(vb), 'pt-BR')
        : String(vb).localeCompare(String(va), 'pt-BR');
    });

    return rows;
  }, [filteredProducts, sortColumn, sortDirection]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 350 * 1024) {
      setFormData(prev => ({
        ...prev,
        image_error: 'A imagem deve ter no máximo 350 KB.',
        image_file: null
      }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setFormData(prev => ({
        ...prev,
        image_error: 'Formato inválido. Use JPG, PNG ou WEBP.',
        image_file: null
      }));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        image_file: file,
        image_url: reader.result as string,
        image_error: ''
      }));
    };

    reader.readAsDataURL(file);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: '',
      price: '',
      product_url: '',
      active: true,
      image_url: '',
      image_file: null,
      image_error: ''
    });
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Nome do produto é obrigatório.');
    if (!formData.category) errors.push('Categoria é obrigatória.');
    if (!formData.price || parseFloat(formData.price) <= 0) errors.push('Preço válido é obrigatório.');
    if (formData.image_error) errors.push(formData.image_error);

    if (errors.length > 0) {
      errors.forEach(showError);
      return;
    }

    setIsSaving(true);

    try {
      const resolvedStoreId = await resolveStoreId(storeId);

      if (editingProduct) {
        const updated = await withStoreId(
          {
            ...editingProduct,
            store_id: resolvedStoreId,
            name: formData.name,
            image_url: formData.image_url || editingProduct.image_url,
            product_url: formData.product_url,
            price: parseFloat(formData.price),
            active: formData.active,
            updated_at: new Date().toISOString(),
            category: formData.category,
          } as Product & Record<string, any>,
          resolvedStoreId
        );

        await db.products.save(updated as Product);

        setProducts(prev =>
          prev.map(p => p.id === editingProduct.id ? updated as Product : p)
        );

        showSuccess('Produto atualizado com sucesso!');
      } else {
        const newProduct = await withStoreId(
          {
            id: crypto.randomUUID(),
            store_id: resolvedStoreId,
            name: formData.name,
            image_url: formData.image_url || '',
            product_url: formData.product_url,
            price: parseFloat(formData.price),
            active: formData.active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: formData.category,
            origin: 'manual',
          } as Product & Record<string, any>,
          resolvedStoreId
        );

        await db.products.save(newProduct as Product);

        setProducts(prev => [newProduct as Product, ...prev]);

        showSuccess('Produto criado com sucesso!');
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        category: '',
        price: '',
        product_url: '',
        active: true,
        image_url: '',
        image_file: null,
        image_error: '',
      });
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      showError('Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteModal({
      isOpen: true,
      productId: product.id,
      productTitle: product.name
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.products.delete(deleteModal.productId);

      setProducts(prev =>
        prev.filter(p => p.id !== deleteModal.productId)
      );

      showSuccess('Produto removido.');
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      showError('Erro ao remover produto.');
    } finally {
      setDeleteModal(prev => ({
        ...prev,
        isOpen: false
      }));
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const resolvedStoreId = await resolveStoreId((product as any).store_id || storeId);
      const nextActive = !(product as any).active;

      const updated = await withStoreId(
        {
          ...product,
          store_id: resolvedStoreId,
          active: nextActive,
          updated_at: new Date().toISOString(),
        } as Product & Record<string, any>,
        resolvedStoreId
      );

      await db.products.save(updated as Product);

      setProducts(prev =>
        prev.map(p => p.id === product.id ? updated as Product : p)
      );
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showError('Erro ao alterar status do produto.');
    }
  };

  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState('');
  const [catNewName, setCatNewName] = useState('');

  const handleCatAdd = () => {
    if (!catNewName.trim()) return;

    setCategories(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: catNewName.trim()
      }
    ]);

    setCatNewName('');
  };

  const handleCatEditStart = (cat: any) => {
    setCatEditingId(cat.id);
    setCatEditName(cat.name);
  };

  const handleCatEditSave = (id: string) => {
    if (!catEditName.trim()) return;

    setCategories(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, name: catEditName.trim() }
          : c
      )
    );

    setCatEditingId(null);
    setCatEditName('');
  };

  const handleCatDelete = (id: string) => {
    if (window.confirm('Excluir esta categoria?')) {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleCatSaveAll = () => {
    setShowCategoriesModal(false);
  };

  const [xmlUrl, setXmlUrl] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [yampiToken, setYampiToken] = useState('');
  const [yampiUrl, setYampiUrl] = useState('');
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [isImportingXml, setIsImportingXml] = useState(false);
  const [importProgressMessage, setImportProgressMessage] = useState('');

  const readTagValue = (item: Element, tagName: string) => {
    const namespaced = item.getElementsByTagNameNS('*', tagName)[0]?.textContent?.trim() || '';
    const plain = item.getElementsByTagName(tagName)[0]?.textContent?.trim() || '';
    return namespaced || plain;
  };

  const parseXmlProducts = async (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    if (xmlDoc.querySelector('parsererror')) {
      throw new Error('XML inválido');
    }

    const items = Array.from(xmlDoc.getElementsByTagName('item'));
    const productsFromXml = items.map((item) => {
      const title = readTagValue(item, 'title');
      const link = readTagValue(item, 'link');
      const priceRaw = readTagValue(item, 'price');
      const imageUrl = readTagValue(item, 'image_link') || readTagValue(item, 'image');
      const category = readTagValue(item, 'product_type') || readTagValue(item, 'google_product_category');
      const normalizedPrice = Number(
        String(priceRaw)
          .replace(/[^[\d,.-]/g, '')
          .replace(/\./g, '')
          .replace(',', '.'),
      );

      return {
        name: title,
        price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
        product_url: link,
        image_url: imageUrl,
        category,
      };
    }).filter((product) => product.name && product.product_url);

    return productsFromXml;
  };

  const handleXmlImport = async () => {
    if (!xmlUrl && !xmlFile) {
      showError('Informe URL ou arquivo XML.');
      return;
    }

    try {
      setIsImportingXml(true);
      setImportProgressMessage('Lendo o feed XML...');

      const xmlText = xmlFile
        ? await xmlFile.text()
        : await fetch(xmlUrl).then((response) => {
            if (!response.ok) {
              throw new Error('Não foi possível baixar o XML');
            }
            return response.text();
          });

      setImportProgressMessage('Processando produtos do feed...');
      const importedProducts = await parseXmlProducts(xmlText);

      if (importedProducts.length === 0) {
        showError('Nenhum produto encontrado no XML.');
        return;
      }

      const resolvedStoreId = await resolveStoreId(storeId);
      const now = new Date().toISOString();
      const existingProducts = await db.products.getAll(resolvedStoreId);
      const existingNames = new Set(existingProducts.map((product) => product.name.toLowerCase()));
      const existingCategories = new Set(
        existingProducts.map((product) => String((product as any).category || '').trim()).filter(Boolean),
      );

      const newProducts = importedProducts.filter((product) => !existingNames.has(product.name.toLowerCase()));

      setImportProgressMessage(`Importando ${newProducts.length} produtos...`);
      await Promise.all(
        newProducts.map(async (product) => {
          const payload = await withStoreId(
            {
              id: generateUuid(),
              name: product.name,
              price: product.price,
              product_url: product.product_url,
              image_url: product.image_url,
              active: true,
              origin: 'integration',
              category: product.category || '',
              created_at: now,
              updated_at: now,
            } as unknown as Product,
            resolvedStoreId,
          );

          return db.products.save(payload);
        }),
      );

      const refreshedProducts = await db.products.getAll(resolvedStoreId);
      setProducts(refreshedProducts);
      setCategories((prev) => {
        const importedCategories = importedProducts
          .map((product) => product.category)
          .filter((category): category is string => Boolean(category && category.trim()));
        const merged = [...prev];

        importedCategories.forEach((categoryName) => {
          if (!existingCategories.has(categoryName) && !merged.some((item) => item.name === categoryName)) {
            merged.push({ id: Date.now().toString() + categoryName, name: categoryName });
          }
        });

        return merged;
      });
      showSuccess(`Importação concluída: ${newProducts.length} produtos adicionados.`);
      setShowImportModal(false);
      setXmlUrl('');
      setXmlFile(null);
      setImportProgressMessage('');
    } catch (error) {
      console.error('Erro ao importar XML:', error);
      showError('Erro ao importar XML. Verifique o link informado.');
    } finally {
      setIsImportingXml(false);
      setImportProgressMessage('');
    }
  };

  const handleApiImport = () => {
    if (!yampiToken || !yampiUrl) {
      showError('Preencha token e URL.');
      return;
    }

    showSuccess('Importação API Yampi iniciada (simulação)');
    setShowImportModal(false);
  };

  const handleSpreadsheetImport = () => {
    if (!spreadsheetFile) {
      showError('Selecione arquivo.');
      return;
    }

    showSuccess('Importação planilha iniciada (simulação)');
    setShowImportModal(false);
  };

  const downloadTemplate = () => {
    const csv = 'nome,categoria,preco,link,imagem_url,status\n"Vestido Floral","Vestidos",189.90,"https://loja.com/produto","https://img.com/1.jpg",ativo\n"Blusa Básica","Blusas",79.90,"https://loja.com/produto","https://img.com/2.jpg",ativo';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = 'modelo-produtos.csv';
    link.click();

    showSuccess('Modelo baixado!');
  };

  const activeCategories = categories.map(c => c.name);

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Produtos
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Gerencie o catálogo de produtos da sua loja.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={openNewProduct}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Novo produto
          </button>

          <button
            type="button"
            onClick={() => setShowCategoriesModal(true)}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Tag size={18} /> Categorias
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Upload size={18} /> Importar produtos
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Categorias</option>
            {activeCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
          </select>

          <select
            value={filterOrigin}
            onChange={e => setFilterOrigin(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todas Origens</option>
            <option value="manual">Manual</option>
            <option value="integration">Integração</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-[80px]">
                  Foto
                </th>

                <th
                  onClick={() => handleSort('produto')}
                  className="cursor-pointer select-none px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest"
                >
                  Produto {sortColumn === 'produto' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </th>

                <th
                  onClick={() => handleSort('preco')}
                  className="cursor-pointer select-none px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center w-32"
                >
                  Preço {sortColumn === 'preco' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </th>

                <th
                  onClick={() => handleSort('categoria')}
                  className="cursor-pointer select-none px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center w-36"
                >
                  Categoria {sortColumn === 'categoria' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </th>

                <th
                  onClick={() => handleSort('video')}
                  className="cursor-pointer select-none px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center w-48"
                >
                  Vídeo Vinculado {sortColumn === 'video' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </th>

                <th
                  onClick={() => handleSort('origem')}
                  className="cursor-pointer select-none px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-28 text-center"
                >
                  <div className="flex items-center justify-center text-center gap-1.5 w-full">
                    <span>Origem</span>
                    {sortColumn === 'origem' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  className="cursor-pointer select-none px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-28 text-center"
                >
                  <div className="flex items-center justify-center text-center gap-1.5 w-full">
                    <span>Status</span>
                    {sortColumn === 'status' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-48 text-center">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedProducts.map(product => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 align-middle">
                    <div className="h-14 w-14 min-h-[56px] min-w-[56px] rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package size={18} className="text-slate-400" />
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 truncate max-w-xs">
                      {product.name}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-center font-black text-slate-800">
                    {Number(product.price || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100 max-w-full truncate">
                      <Tag size={12} className="shrink-0" />
                      <span className="truncate">
                        {(product as any).category || 'Sem categoria'}
                      </span>
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {(product as any).video ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 text-[#0094EB] text-sm font-bold truncate">
                        {(product as any).video}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm italic">
                        Nenhum
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center text-center w-full">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          (product as any).origin === 'manual'
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}
                      >
                        {(product as any).origin === 'manual' ? <Tag size={10} /> : <Globe size={10} />}
                        {(product as any).origin === 'manual' ? 'Manual' : 'Integração XML'}
                      </span>

                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center text-center w-full">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(product)}
                        className={cn(
                          "inline-flex h-8 w-[112px] min-w-[112px] items-center justify-center rounded-lg px-4 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                          (product as any).active
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                        )}
                      >
                        {(product as any).active ? 'ATIVO' : 'DESATIVADO'}
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openEditProduct(product)}
                        className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteClick(product)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
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
            <p className="text-slate-500 font-bold">
              Nenhum produto encontrado.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tente ajustar os filtros ou cadastre um novo produto.
            </p>
          </div>
        )}
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>

              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              id="product-form"
              onSubmit={handleSaveProduct}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Foto do Produto máx. 350 KB
                </label>

                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                    {formData.image_url ? (
                      <img
                        src={formData.image_url}
                        className="w-full h-full object-cover"
                        alt="Preview"
                      />
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

                    {formData.image_error && (
                      <p className="text-xs text-rose-500">
                        {formData.image_error}
                      </p>
                    )}

                    {formData.image_file && (
                      <p className="text-xs text-slate-500">
                        {formData.image_file.name} ({(formData.image_file.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nome do Produto
                </label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Categoria
                </label>

                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Preço
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Link do Produto
                </label>

                <input
                  type="url"
                  value={formData.product_url}
                  onChange={e => setFormData({ ...formData, product_url: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  placeholder="https://sualoja.com/produto"
                />
              </div>

              {editingProduct && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </label>

                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, active: e.target.value === 'true' })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Desativado</option>
                  </select>
                </div>
              )}
            </form>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-[2rem]">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="product-form"
                className="px-6 py-3 bg-[#0094EB] text-white rounded-xl font-black text-sm hover:bg-[#0E4787] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoriesModal && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-black text-slate-900">
                Gerenciar Categorias
              </h2>

              <button
                type="button"
                onClick={() => setShowCategoriesModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex gap-2">
                <input
                  value={catNewName}
                  onChange={(e) => setCatNewName(e.target.value)}
                  placeholder="Nova categoria"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
                />

                <button
                  type="button"
                  onClick={handleCatAdd}
                  className="rounded-xl bg-[#0094EB] px-5 py-3 text-sm font-black text-white hover:bg-[#0E4787]"
                >
                  Adicionar
                </button>
              </div>

              <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    {catEditingId === cat.id ? (
                      <input
                        value={catEditName}
                        onChange={(e) => setCatEditName(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-bold text-slate-800">
                        {cat.name}
                      </span>
                    )}

                    {catEditingId === cat.id ? (
                      <button
                        type="button"
                        onClick={() => handleCatEditSave(cat.id)}
                        className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black text-white"
                      >
                        Salvar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCatEditStart(cat)}
                        className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-600"
                      >
                        Editar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCatDelete(cat.id)}
                      className="rounded-xl bg-white px-4 py-2 text-xs font-black text-rose-500"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
              <button
                type="button"
                onClick={() => setShowCategoriesModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCatSaveAll}
                className="rounded-xl bg-[#0094EB] px-5 py-3 text-sm font-black text-white hover:bg-[#0E4787]"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-black text-slate-900">
                Importar produtos
              </h2>

              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setImportTab('xml')}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm font-black',
                    importTab === 'xml'
                      ? 'border-[#0094EB] bg-[#EAF6FF] text-[#0094EB]'
                      : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  XML
                </button>

                <button
                  type="button"
                  onClick={() => setImportTab('api')}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm font-black',
                    importTab === 'api'
                      ? 'border-[#0094EB] bg-[#EAF6FF] text-[#0094EB]'
                      : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  API Yampi
                </button>

                <button
                  type="button"
                  onClick={() => setImportTab('sheet')}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm font-black',
                    importTab === 'sheet'
                      ? 'border-[#0094EB] bg-[#EAF6FF] text-[#0094EB]'
                      : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  Planilha
                </button>
              </div>

              {importTab === 'xml' && (
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 relative">

                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-slate-100">
                    <FileText className="mt-0.5 text-[#0094EB]" size={18} />
                    <p className="text-xs font-bold text-slate-600">
                      Envie a URL do feed XML do Google Shopping ou selecione o arquivo. Serão importados apenas nome, preço, link e a primeira imagem.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link do XML</label>
                    <input
                      value={xmlUrl}
                      onChange={(e) => setXmlUrl(e.target.value)}
                      placeholder="https://.../feed.xml"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arquivo XML</label>
                    <input
                      type="file"
                      accept=".xml,text/xml,application/xml"
                      onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleXmlImport}
                      disabled={isImportingXml}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-3 text-sm font-black text-white hover:bg-[#0E4787] disabled:opacity-60"
                    >
                      {isImportingXml ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
                      {isImportingXml ? 'Importando...' : 'Importar XML'}
                    </button>
                  </div>
                </div>
              )}

              {importTab === 'api' && (
                <div className="space-y-4">
                  <input
                    value={yampiToken}
                    onChange={(e) => setYampiToken(e.target.value)}
                    placeholder="Token Yampi"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
                  />

                  <input
                    value={yampiUrl}
                    onChange={(e) => setYampiUrl(e.target.value)}
                    placeholder="URL da loja"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleApiImport}
                      className="rounded-xl bg-[#0094EB] px-5 py-3 text-sm font-black text-white hover:bg-[#0E4787]"
                    >
                      Importar API
                    </button>
                  </div>
                </div>
              )}

              {importTab === 'sheet' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setSpreadsheetFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600"
                    >
                      Baixar modelo
                    </button>

                    <button
                      type="button"
                      onClick={handleSpreadsheetImport}
                      className="rounded-xl bg-[#0094EB] px-5 py-3 text-sm font-black text-white hover:bg-[#0E4787]"
                    >
                      Importar planilha
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isImportingXml && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
          <div className="flex w-full max-w-sm items-center gap-4 rounded-3xl bg-white p-6 shadow-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-[#0094EB]" />
            <div>
              <p className="text-sm font-black text-slate-900">Aguarde</p>
              <p className="text-sm font-bold text-slate-500">
                {importProgressMessage || 'Importando produtos do XML...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog

        isOpen={deleteModal.isOpen}
        title="EXCLUIR PRODUTO"
        itemName={deleteModal.productTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ProductsPage;
