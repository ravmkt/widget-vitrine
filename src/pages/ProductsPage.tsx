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

type ImportedProduct = {
  name: string;
  price: number;
  product_url: string;
  image_url: string;
  category: string;
  sku: string;
  idValue: string;
  description: string;
};

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
    bulkMode: boolean;
  }>({
    isOpen: false,
    productId: '',
    productTitle: '',
    bulkMode: false,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);



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

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = startIdx + pageSize;

  const pagedProducts = useMemo(
    () => sortedProducts.slice(startIdx, endIdx),
    [sortedProducts, startIdx, endIdx]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, filterOrigin]);

  const allFilteredIds = useMemo(() => sortedProducts.map(p => p.id), [sortedProducts]);
  const pageIds = useMemo(() => pagedProducts.map(p => p.id), [pagedProducts]);

  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

  const selectAllFiltered = () => {
    setSelectedIds(new Set(allFilteredIds));
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      productTitle: product.name,
      bulkMode: false,
    });
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setDeleteModal({
      isOpen: true,
      productId: '',
      productTitle: `${selectedIds.size} ${selectedIds.size === 1 ? 'produto' : 'produtos'}`,
      bulkMode: true,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteModal.bulkMode) {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map(id => db.products.delete(id)));
        setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
        showSuccess(`${ids.length} ${ids.length === 1 ? 'produto removido' : 'produtos removidos'}.`);
      } else {
        await db.products.delete(deleteModal.productId);
        setProducts(prev => prev.filter(p => p.id !== deleteModal.productId));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteModal.productId); return n; });
        showSuccess('Produto removido.');
      }
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      showError('Erro ao remover produto.');
    } finally {
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
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
  const [importedXmlProducts, setImportedXmlProducts] = useState<ImportedProduct[]>([]);
  const [selectedXmlKeys, setSelectedXmlKeys] = useState<Set<string>>(new Set());
  const [xmlPreviewSearch, setXmlPreviewSearch] = useState('');
  const [xmlPreviewCategory, setXmlPreviewCategory] = useState('all');
  const [xmlPreviewPageSize, setXmlPreviewPageSize] = useState(10);
  const [xmlPreviewPage, setXmlPreviewPage] = useState(1);

  const sanitizeXmlText = (value: string) => {
    return value
      .replace(/^\uFEFF/, '')
      .replace(/^\uFEFF/, '')
      .trimStart();
  };

  const parseXmlProducts = (rawXmlText: string) => {
    const xmlText = sanitizeXmlText(rawXmlText);

    if (!xmlText) {
      throw new Error('A resposta do XML está vazia.');
    }

    const preview = xmlText.slice(0, 500).toLowerCase();

    if (
      preview.startsWith('<!doctype html') ||
      preview.startsWith('<html') ||
      preview.includes('cannot get') ||
      preview.includes('<body')
    ) {
      throw new Error('O feed XML retornou HTML ou conteúdo não esperado.');
    }

    if (preview.startsWith('{') || preview.startsWith('[')) {
      throw new Error('O proxy retornou uma mensagem de erro em vez do XML.');
    }

    if (!xmlText.includes('<')) {
      throw new Error('A resposta recebida não parece ser XML.');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
    const parserError = xmlDoc.querySelector('parsererror');

    if (parserError) {
      const detail = parserError.textContent?.replace(/\s+/g, ' ').trim();
      console.error('[xml-debug] parser error', {
        detail,
        preview: xmlText.slice(0, 500),
      });
      throw new Error(detail ? `Erro de sintaxe no XML: ${detail}` : 'O XML possui erro de sintaxe.');
    }

    const getTextByAliases = (item: Element, aliases: string[]) => {
      const children = Array.from(item.children || []);
      for (const alias of aliases) {
        const node = children.find(
          (child) =>
            child.nodeName === alias ||
            child.localName === alias ||
            child.nodeName.split(':').pop() === alias,
        );
        const value = node?.textContent?.trim();
        if (value) return value;
      }
      return '';
    };

    const normalizePrice = (value: string) => {
      const cleaned = value.replace(/<[^>]*>/g, '').replace(/[^\d.,-]/g, '');
      if (!cleaned) return 0;
      const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const findProductNodes = () => {
      const allElements = Array.from(xmlDoc.getElementsByTagName('*'));
      return allElements.filter((node) => {
        const name = (node.localName || node.nodeName).split(':').pop() || node.nodeName;
        return ['item', 'product', 'entry', 'produto', 'offer'].includes(name.toLowerCase());
      });
    };

    const items = findProductNodes();
    console.log('[xml-debug]', {
      foundProductNodes: items.length,
      preview: xmlText.slice(0, 500),
    });

    return items
      .map((item) => {
        console.log('[xml-debug]', {
          productNode: (item.localName || item.nodeName).split(':').pop(),
        });

        const name = getTextByAliases(item, ['title', 'name', 'nome', 'product_name', 'g:title']);
        const priceRaw = getTextByAliases(item, ['price', 'sale_price', 'valor', 'preco', 'price_with_tax', 'g:price']);
        const link = getTextByAliases(item, ['link', 'url', 'product_url', 'g:link']);
        const imageUrl = getTextByAliases(item, ['image_link', 'image', 'imagem', 'picture', 'g:image_link', 'additional_image_link']);
        const category = getTextByAliases(item, ['product_type', 'google_product_category']);
        const sku = getTextByAliases(item, ['sku', 'reference', 'codigo']);
        const idValue = getTextByAliases(item, ['id', 'g:id']);
        const description = stripHtml(getTextByAliases(item, ['description', 'descricao', 'summary', 'content']));

        return {
          name,
          price: normalizePrice(priceRaw),
          product_url: link,
          image_url: imageUrl,
          category,
          sku,
          idValue,
          description,
        };
      })
      .filter((product) => product.name);
  };

  const getXmlProductKey = (product: ImportedProduct) =>
    [product.sku.trim().toLowerCase(), product.idValue.trim().toLowerCase(), product.product_url.trim().toLowerCase(), product.name.trim().toLowerCase()].join('|');

  const normalizeXmlText = (value: string) =>
    value
      .replace(/&gt;/g, '>')
      .replace(/>/g, ' > ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const formatXmlCategory = (value: string) =>
    value.replace(/&gt;|>/g, ': ').replace(/\s+/g, ' ').replace(/:\s*/g, ': ').replace(/\s*:\s*/g, ': ').replace(/:\s*/g, ': ').replace(/\s+([A-Za-zÀ-ÿ])/g, ' $1').trim();

  const filteredXmlProducts = importedXmlProducts.filter((product) => {
    const query = normalizeXmlText(xmlPreviewSearch);
    const normalizedCategory = normalizeXmlText(formatXmlCategory(product.category || 'Sem categoria'));
    const matchesCategory = xmlPreviewCategory === 'all' || normalizedCategory === normalizeXmlText(xmlPreviewCategory);
    if (!query) return matchesCategory;

    const matchesName = normalizeXmlText(product.name).includes(query);
    return matchesCategory && matchesName;
  });

  const xmlPreviewCategories = Array.from(new Set(importedXmlProducts.map((product) => formatXmlCategory(product.category || 'Sem categoria')))).sort();

  const totalXmlProducts = importedXmlProducts.length;
  const totalXmlPages = Math.max(1, Math.ceil(filteredXmlProducts.length / xmlPreviewPageSize));
  const safeXmlPreviewPage = Math.min(xmlPreviewPage, totalXmlPages);
  const xmlPreviewPageItems = filteredXmlProducts.slice((safeXmlPreviewPage - 1) * xmlPreviewPageSize, safeXmlPreviewPage * xmlPreviewPageSize);
  const selectedXmlCount = selectedXmlKeys.size;
  const allVisibleSelected = xmlPreviewPageItems.length > 0 && xmlPreviewPageItems.every((product) => selectedXmlKeys.has(getXmlProductKey(product)));
  const allFilteredXmlSelected = filteredXmlProducts.length > 0 && filteredXmlProducts.every((product) => selectedXmlKeys.has(getXmlProductKey(product)));

  const setSelectedXmlProduct = (product: ImportedProduct, checked: boolean) => {
    const key = getXmlProductKey(product);
    setSelectedXmlKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleSelectAllVisibleXml = (checked: boolean) => {
    setSelectedXmlKeys((prev) => {
      const next = new Set(prev);
      xmlPreviewPageItems.forEach((product) => {
        const key = getXmlProductKey(product);
        if (checked) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const toggleSelectAllXml = (checked: boolean) => {
    setSelectedXmlKeys(() => {
      if (!checked) return new Set();
      return new Set(importedXmlProducts.map((product) => getXmlProductKey(product)));
    });
  };

  const readXmlFeed = async () => {
    const rawUrl = xmlUrl.trim();
    if (!rawUrl && !xmlFile) {
      showError('Informe URL ou arquivo XML.');
      return;
    }

    try {
      setIsImportingXml(true);
      setImportProgressMessage('Lendo e interpretando o XML...');

      const responseText = xmlFile
        ? await xmlFile.text().catch(() => { throw new Error('Não foi possível ler o arquivo XML.'); })
        : await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-xml?url=${encodeURIComponent(rawUrl)}`, {
            method: 'GET',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            cache: 'no-store',
          }).then(async (response) => {
            const text = await response.text();
            if (!response.ok) {
              try {
                const parsed = JSON.parse(text);
                throw new Error(parsed.error || `Erro HTTP ao baixar o XML (${response.status}).`);
              } catch {
                throw new Error(`Erro HTTP ao baixar o XML (${response.status}).`);
              }
            }
            return text;
          });

      if (!responseText.trim()) throw new Error('A resposta do XML está vazia.');
      const parsedProducts = parseXmlProducts(responseText);
      if (!parsedProducts.length) throw new Error('XML válido, mas nenhum produto foi reconhecido.');

      setImportedXmlProducts(parsedProducts);
      setSelectedXmlKeys(new Set());
      setXmlPreviewPage(1);
      setShowImportModal(true);
      showSuccess(`${parsedProducts.length} produtos encontrados no XML.`);

    } catch (error: unknown) {
      console.error('Erro ao ler XML:', error);
      showError(error instanceof Error ? error.message : 'Erro ao ler XML.');
    } finally {
      setIsImportingXml(false);
      setImportProgressMessage('');
    }
  };

  const handleXmlImportSelected = async () => {
    const selectedProducts = importedXmlProducts.filter((product) => selectedXmlKeys.has(getXmlProductKey(product)));
    if (!selectedProducts.length) {
      showError('Selecione ao menos um produto para importar.');
      return;
    }

    try {
      setIsImportingXml(true);
      const resolvedStoreId = await resolveStoreId(storeId);
      const now = new Date().toISOString();
      const existingProducts = await db.products.getAll(resolvedStoreId);
      const existingSkus = new Set(existingProducts.map((product) => String((product as any).sku || '').trim().toLowerCase()).filter(Boolean));
      let saved = 0;

      for (let index = 0; index < selectedProducts.length; index += 20) {
        const batch = selectedProducts.slice(index, index + 20);
        setImportProgressMessage(`Importando ${Math.min(index + 1, selectedProducts.length)}-${Math.min(index + batch.length, selectedProducts.length)} de ${selectedProducts.length} produtos...`);
        for (const product of batch) {
          const sku = String(product.sku || '').trim().toLowerCase();
          if (sku && existingSkus.has(sku)) continue;
          if (sku) existingSkus.add(sku);

          try {
            const payload = await withStoreId(
              {
                id: generateUuid(),
                name: product.name,
                price: product.price,
                product_url: product.product_url,
                image_url: product.image_url || '',
                active: true,
                origin: 'xml',
                category: product.category || '',
                sku: product.sku || '',
                short_description: product.description || '',
                created_at: now,
                updated_at: now,
              } as unknown as Product,
              resolvedStoreId,
            );
            await db.products.save(payload);
            saved += 1;
          } catch (error) {
            console.error('Erro ao importar produto XML:', error);
          }
        }
      }

      const refreshedProducts = await db.products.getAll(resolvedStoreId);
      setProducts(refreshedProducts);
      setSelectedIds(new Set());
      setSelectedXmlKeys(new Set());
      setImportedXmlProducts([]);
      setShowImportModal(false);
      setXmlPreviewSearch('');
      setXmlPreviewCategory('all');
      setXmlPreviewPage(1);
      showSuccess(`${saved} produtos importados com sucesso.`);

    } catch (error: unknown) {
      console.error('Erro ao importar XML:', error);
      showError(error instanceof Error ? error.message : 'Erro ao importar XML.');
    } finally {
      setIsImportingXml(false);
      setImportProgressMessage('');
    }
  };

  const handleXmlImport = async () => {

    const rawUrl = xmlUrl.trim();
    if (!rawUrl && !xmlFile) {
      showError('Informe URL ou arquivo XML.');
      return;
    }

    try {
      setIsImportingXml(true);
      setImportProgressMessage('Lendo o feed XML...');

      const responseText = xmlFile
        ? await xmlFile.text().catch(() => {
            throw new Error('Não foi possível ler o arquivo XML.');
          })
        : await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-xml?url=${encodeURIComponent(rawUrl)}`,
    {
      method: 'GET',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    },
  ).then(async (response) => {

            const text = await response.text();
            console.log('[xml-debug]', {
              status: response.status,
              contentType: response.headers.get('content-type'),
              size: text.length,
              preview: text.slice(0, 500),
            });

            if (!response.ok) {
              try {
                const parsed = JSON.parse(text);
                throw new Error(parsed.error || `Erro HTTP ao baixar o XML (${response.status}).`);
              } catch {
                throw new Error(`Erro HTTP ao baixar o XML (${response.status}).`);
              }
            }

            return text;
          });

      const xmlText = responseText;

      if (!xmlText.trim()) {
        throw new Error('A resposta do XML está vazia.');
      }

      setImportProgressMessage('Processando produtos do feed...');
      const importedProducts = parseXmlProducts(xmlText);

      if (importedProducts.length === 0) {
        throw new Error('XML válido, mas nenhum produto foi reconhecido.');
      }

      const resolvedStoreId = await resolveStoreId(storeId);
      const now = new Date().toISOString();
      const existingProducts = await db.products.getAll(resolvedStoreId);
      const existingCategories = new Set(existingProducts.map((product) => String((product as any).category || '').trim()).filter(Boolean));
      const existingSkus = new Set(existingProducts.map((product) => String((product as any).sku || '').trim().toLowerCase()).filter(Boolean));

      const importedProductsFiltered = importedProducts.filter((product) => {
        const sku = String(product.sku || '').trim().toLowerCase();
        return !sku || !existingSkus.has(sku);
      });

      setImportProgressMessage(`Importando ${importedProductsFiltered.length} produtos...`);
      for (const product of importedProductsFiltered) {
        const sku = String(product.sku || '').trim().toLowerCase();
        if (sku && existingSkus.has(sku)) continue;
        if (sku) existingSkus.add(sku);

        const payload = await withStoreId(
          {
            id: generateUuid(),
            name: product.name,
            price: product.price,
            product_url: product.product_url,
            image_url: product.image_url || '',
            active: true,
            origin: 'xml',
            category: product.category || '',
            sku: product.sku || '',
            short_description: product.description || '',
            created_at: now,
            updated_at: now,
          } as unknown as Product,
          resolvedStoreId,
        );

        await db.products.save(payload);
      }

      const refreshedProducts = await db.products.getAll(resolvedStoreId);
      setProducts(refreshedProducts);
      setCategories((prev) => {
        const merged = [...prev];
        importedProducts
          .map((product) => product.category)
          .filter((category): category is string => Boolean(category && category.trim()))
          .forEach((categoryName) => {
            if (!existingCategories.has(categoryName) && !merged.some((item) => item.name === categoryName)) {
              merged.push({ id: Date.now().toString() + categoryName, name: categoryName });
            }
          });
        return merged;
      });

      showSuccess(`Importação concluída: ${importedProducts.length} encontrados, ${importedProductsFiltered.length} importados, ${importedProducts.length - importedProductsFiltered.length} ignorados.`);
      setShowImportModal(false);
      setImportedXmlProducts([]);
      setSelectedXmlKeys(new Set());
      setXmlUrl('');
      setXmlFile(null);
      setXmlPreviewSearch('');
      setXmlPreviewCategory('all');
      setXmlPreviewPage(1);
      setImportProgressMessage('');

    } catch (error) {
      console.error('Erro ao importar XML:', error);
      showError(error instanceof Error ? error.message : 'Erro ao importar XML. Verifique o link informado.');
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-slate-500">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
          </p>
          {selectedIds.size > 0 && (
            <span className="rounded-full bg-[#EAF6FF] px-3 py-1 text-xs font-black text-[#0094EB]">
              {selectedIds.size} selecionados
            </span>
          )}
          {!allFilteredSelected && selectedIds.size > 0 && selectedIds.size < filteredProducts.length && (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="text-xs font-black text-[#0094EB] underline hover:text-[#0E4787]"
            >
              Selecionar todos os {filteredProducts.length}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDeleteClick}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-600 transition-all hover:bg-rose-100"
            >
              <Trash2 size={16} />
              Excluir {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Itens por página</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 outline-none focus:border-[#0094EB]"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-center w-[48px]">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#0094EB] focus:ring-[#0094EB]"
                  />
                </th>

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
              {pagedProducts.map(product => (

                <tr
                  key={product.id}
                  className={cn(
                    "transition-colors",
                    selectedIds.has(product.id) ? "bg-[#EAF6FF]/60" : "hover:bg-slate-50/50"
                  )}
                >
                  <td className="px-4 py-4 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelectOne(product.id)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#0094EB] focus:ring-[#0094EB]"
                    />
                  </td>

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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - safePage) <= 1)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="text-slate-300">…</span>}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'h-9 w-9 rounded-lg text-xs font-black transition-all',
                      page === safePage
                        ? 'bg-[#0094EB] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Próxima
            </button>
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
              <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3">

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
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 relative">

                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-slate-100">
                    <FileText className="mt-0.5 text-[#0094EB]" size={18} />
                    <p className="text-xs font-bold text-slate-600">
                      Envie a URL do feed XML ou selecione o arquivo. Primeiro o sistema lê e interpreta o XML sem salvar nada. Depois você escolhe os produtos e importa apenas os selecionados.
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

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={readXmlFeed}
                    disabled={isImportingXml}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0094EB] bg-white px-5 py-3 text-sm font-black text-[#0094EB] hover:bg-[#EAF6FF] disabled:opacity-60"
                  >
                    {isImportingXml ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
                    Ler XML
                  </button>
                  <button
                    type="button"
                    onClick={handleXmlImportSelected}
                    disabled={isImportingXml || !selectedXmlCount}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-3 text-sm font-black text-white hover:bg-[#0E4787] disabled:opacity-60"
                  >
                    Importar selecionados
                  </button>
                </div>

                {importedXmlProducts.length > 0 && showImportModal && (
                  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm">
                    <div className="flex w-full max-w-4xl flex-col rounded-[1.75rem] bg-white shadow-2xl max-h-[92vh] overflow-hidden">
                      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-900">Prévia dos produtos encontrados</p>
                            <p className="text-xs font-bold text-slate-500">{totalXmlProducts} produtos encontrados</p>
                          </div>
                          <button type="button" onClick={() => setImportedXmlProducts([])} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Voltar</button>

                        </div>

                        <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                          <input value={xmlPreviewSearch} onChange={(e) => { setXmlPreviewSearch(e.target.value); setXmlPreviewPage(1); }} placeholder="Buscar por nome, SKU ou categoria" className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-[#0094EB] sm:flex-[1.3] sm:max-w-[20rem]" />

                          <select value={xmlPreviewCategory} onChange={(e) => { setXmlPreviewCategory(e.target.value); setXmlPreviewPage(1); }} className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-bold outline-none focus:border-[#0094EB] sm:flex-1 sm:max-w-[15rem]">
                            <option value="all">Todas as categorias</option>
                            {xmlPreviewCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                          <button type="button" onClick={() => toggleSelectAllXml(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Selecionar tudo</button>
                          <button type="button" onClick={() => setSelectedXmlKeys(new Set())} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Limpar tudo</button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                          <label className="flex min-w-0 items-center gap-2">
                            <input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleSelectAllVisibleXml(e.target.checked)} />
                            <span className="min-w-0 break-words">Selecionar todos desta página</span>
                          </label>
                          <select value={xmlPreviewPageSize} onChange={(e) => { setXmlPreviewPageSize(Number(e.target.value)); setXmlPreviewPage(1); }} className="w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
                            {[10, 20, 50].map((size) => <option key={size} value={size}>{size} por página</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 sm:px-6">

                        <div className="space-y-3">
                          {xmlPreviewPageItems.map((product) => {
                            const key = getXmlProductKey(product);
                            return (
                              <div key={key} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                <div className="grid grid-cols-[auto_48px_1fr] gap-3 sm:grid-cols-[auto_56px_minmax(0,1.25fr)_repeat(4,minmax(0,1fr))] sm:items-start">
                                  <div className="flex items-start pt-2"><input type="checkbox" checked={selectedXmlKeys.has(key)} onChange={(e) => setSelectedXmlProduct(product, e.target.checked)} /></div>
                                  <div><img src={product.image_url || 'https://via.placeholder.com/72'} alt={product.name} className="h-12 w-12 rounded-xl object-cover" loading="lazy" /></div>
                                  <div className="min-w-0 space-y-1 sm:col-span-6">
                                    <div className="truncate text-sm font-bold text-slate-900 sm:text-base">{product.name}</div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[11px] font-bold text-slate-500 sm:grid-cols-4 sm:text-xs">
                                      <div className="min-w-0"><span className="block uppercase tracking-widest text-[9px] text-slate-400">SKU</span><span className="block truncate">{product.sku || '-'}</span></div>
                                      <div className="min-w-0"><span className="block uppercase tracking-widest text-[9px] text-slate-400">Preço</span><span className="block truncate">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                      <div className="min-w-0"><span className="block uppercase tracking-widest text-[9px] text-slate-400">Marca</span><span className="block truncate">{product.idValue || '-'}</span></div>
                                      <div className="min-w-0"><span className="block uppercase tracking-widest text-[9px] text-slate-400">Categoria</span><span className="block truncate">{formatXmlCategory(product.category || 'Sem categoria')}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 px-5 py-3 text-sm font-bold text-slate-500 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span>{selectedXmlCount} produto(s) selecionado(s)</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setXmlPreviewPage((page) => Math.max(1, page - 1))} disabled={safeXmlPreviewPage === 1} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Anterior</button>
                            <button type="button" onClick={() => setXmlPreviewPage((page) => Math.min(totalXmlPages, page + 1))} disabled={safeXmlPreviewPage === totalXmlPages} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Próxima</button>
                            <button type="button" onClick={handleXmlImportSelected} disabled={isImportingXml || !selectedXmlCount} className="rounded-xl bg-[#0094EB] px-4 py-2 text-sm font-black text-white hover:bg-[#0E4787] disabled:opacity-60">Importar selecionados</button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

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
        <div className="fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto bg-slate-950/50 backdrop-blur-sm px-3 py-2 sm:items-center sm:py-4">
          <div className="flex w-full max-w-2xl items-center gap-4 rounded-3xl bg-white p-4 shadow-2xl sm:p-5 max-h-[94vh] overflow-hidden">

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
        title={deleteModal.bulkMode ? 'EXCLUIR PRODUTOS' : 'EXCLUIR PRODUTO'}
        itemName={deleteModal.productTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default ProductsPage;
