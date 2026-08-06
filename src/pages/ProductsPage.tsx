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

const sanitizeXmlText = (value: string) => {
  return value
    .replace(/^\uFEFF/, '')
    .trimStart();
};

const normalizeSkuValue = (value: string) =>
  value
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const normalizeExternalIdValue = (value: string) =>
  value
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isValidSkuValue = (value: string) => {
  const normalized = normalizeSkuValue(value);
  if (!normalized) return false;
  return !['-', '—', 'N/A', 'NA', 'NULL', 'UNDEFINED'].includes(normalized.toUpperCase());
};

const parseXmlProducts = (rawXmlText: string): ImportedProduct[] => {
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
    throw new Error(detail ? `Erro de sintaxe no XML: ${detail}` : 'O XML possui erro de sintaxe.');
  }

  const normalizeFieldName = (value: string) =>
    value
      .replace(/^.*:/, '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();

  const collectNodeValues = (item: Element) => {
    const values = new Map<string, string>();
    const walk = (node: Element, path: string[]) => {
      const name = normalizeFieldName(node.nodeName || node.localName || '');
      const nextPath = [...path, name].filter(Boolean);
      const text = node.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (text) {
        const key = nextPath.join('.');
        if (!values.has(key)) values.set(key, text);
        if (!values.has(name)) values.set(name, text);
      }
      Array.from(node.children || []).forEach((child) => walk(child as Element, nextPath));
    };
    walk(item, []);
    return values;
  };

  const findNodeValue = (item: Element, aliases: string[]) => {
    const values = collectNodeValues(item);
    const entries = Array.from(values.entries());
    for (const alias of aliases) {
      const normalizedAlias = normalizeFieldName(alias);
      const exactMatch = values.get(normalizedAlias);
      if (exactMatch) return exactMatch;
      const partialMatch = entries.find(([key]) => key.split('.').some((part) => part === normalizedAlias));
      if (partialMatch?.[1]) return partialMatch[1];
      const nestedMatch = entries.find(([key]) => key.includes(normalizedAlias));
      if (nestedMatch?.[1]) return nestedMatch[1];
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

  return items
    .map((item) => {
      const name = findNodeValue(item, ['title', 'name', 'nome', 'product_name', 'g:title']);
      const priceRaw = findNodeValue(item, ['price', 'sale_price', 'valor', 'preco', 'price_with_tax', 'g:price']);
      const link = findNodeValue(item, ['link', 'url', 'product_url', 'g:link']);
      const imageUrl = findNodeValue(item, ['image_link', 'image', 'imagem', 'picture', 'g:image_link', 'additional_image_link']);
      const category = findNodeValue(item, ['product_type', 'google_product_category']);
      const skuRaw = findNodeValue(item, ['mpn', 'g:mpn']);
      const externalIdRaw = findNodeValue(item, ['id', 'g:id']);
      const sku = isValidSkuValue(skuRaw) ? normalizeSkuValue(skuRaw) : '';
      const externalId = normalizeExternalIdValue(externalIdRaw);
      const description = stripHtml(findNodeValue(item, ['description', 'descricao', 'summary', 'content']));

      return {
        name,
        price: normalizePrice(priceRaw),
        product_url: link,
        image_url: imageUrl,
        category,
        sku,
        idValue: externalId,
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
  value.replace(/&gt;|>/g, ': ').replace(/\s+/g, ' ').replace(/\s*:\s*/g, ': ').replace(/\s+([A-Za-zÀ-ÿ])/g, ' $1').trim();

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
  // 🆕 Filtro de vídeo (ativado via query param ?sem-video=true)
  const [filterVideo, setFilterVideo] = useState<'all' | 'with' | 'without'>('all');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'xml' | 'sheet'>('xml');

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

  // 🆕 useEffect com leitura do query param ?sem-video=true
  useEffect(() => {
    const load = async () => {
      try {
        const resolvedStoreId = await resolveStoreId(storeId);
        const allProducts = await db.products.getAll(resolvedStoreId);
        setProducts(allProducts);

        // 🆕 Lê query param ?sem-video=true
        const params = new URLSearchParams(window.location.search);
        if (params.get('sem-video') === 'true') {
          setFilterVideo('without');
        }
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

  // 🆕 filteredProducts com filtro de vídeo
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || (p as any).category === filterCategory;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? (p as any).active : !(p as any).active);
      const matchesOrigin = filterOrigin === 'all' || (p as any).origin === filterOrigin;

      // 🆕 Filtro de vídeo
      const hasVideo = !!(p as any).video;
      const matchesVideo =
        filterVideo === 'all' ||
        (filterVideo === 'with' && hasVideo) ||
        (filterVideo === 'without' && !hasVideo);

      return matchesSearch && matchesCategory && matchesStatus && matchesOrigin && matchesVideo;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterOrigin, filterVideo]);
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

  // 🆕 reset de página também quando filterVideo muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, filterOrigin, filterVideo]);

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
            id: generateUuid(),
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
      const nextActive = !product.active;

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

  // ─── XML Import States ────────────────────────────────────────────

  const [xmlUrl, setXmlUrl] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [isImportingXml, setIsImportingXml] = useState(false);
  const [importProgressMessage, setImportProgressMessage] = useState('');
  const [importedXmlProducts, setImportedXmlProducts] = useState<ImportedProduct[]>([]);
  const [selectedXmlKeys, setSelectedXmlKeys] = useState<Set<string>>(new Set());
  const [xmlPreviewSearch, setXmlPreviewSearch] = useState('');
  const [xmlPreviewCategory, setXmlPreviewCategory] = useState('all');
  const [xmlPreviewPageSize, setXmlPreviewPageSize] = useState(10);
  const [xmlPreviewPage, setXmlPreviewPage] = useState(1);

  // ─── XML Preview Derived ──────────────────────────────────────────

  const filteredXmlProducts = importedXmlProducts.filter((product) => {
    const query = normalizeXmlText(xmlPreviewSearch);
    const normalizedCategory = normalizeXmlText(formatXmlCategory(product.category || 'Sem categoria'));
    const matchesCategory = xmlPreviewCategory === 'all' || normalizedCategory === normalizeXmlText(xmlPreviewCategory);
    if (!query) return matchesCategory;

    const matchesName = normalizeXmlText(product.name).includes(query);
    return matchesCategory && matchesName;
  });

  const xmlPreviewCategories = Array.from(
    new Set(importedXmlProducts.map((product) => formatXmlCategory(product.category || 'Sem categoria')))
  ).sort();

  const totalXmlProducts = importedXmlProducts.length;
  const totalXmlPages = Math.max(1, Math.ceil(filteredXmlProducts.length / xmlPreviewPageSize));
  const safeXmlPreviewPage = Math.min(xmlPreviewPage, totalXmlPages);
  const xmlPreviewPageItems = filteredXmlProducts.slice(
    (safeXmlPreviewPage - 1) * xmlPreviewPageSize,
    safeXmlPreviewPage * xmlPreviewPageSize
  );
  const selectedXmlCount = selectedXmlKeys.size;
  const allVisibleSelected =
    xmlPreviewPageItems.length > 0 &&
    xmlPreviewPageItems.every((product) => selectedXmlKeys.has(getXmlProductKey(product)));

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

  // ─── XML Import: Leitura do feed ─────────────────────────────────

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
            }
          ).then(async (response) => {
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

  // ─── XML Import: Importação dos selecionados ─────────────────────

  const handleXmlImportSelected = async () => {
    const selectedProducts = importedXmlProducts.filter((product) =>
      selectedXmlKeys.has(getXmlProductKey(product))
    );
    if (!selectedProducts.length) {
      showError('Selecione ao menos um produto para importar.');
      return;
    }

    try {
      setIsImportingXml(true);
      const resolvedStoreId = await resolveStoreId(storeId);
      const now = new Date().toISOString();
      const existingProducts = await db.products.getAll(resolvedStoreId);
      const existingSkus = new Set(
        existingProducts
          .map((product) => String((product as any).sku || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const selectedSkus = new Set<string>();
      const summary = {
        imported: 0,
        existing: 0,
        repeated: 0,
        invalid: 0,
      };

      for (let index = 0; index < selectedProducts.length; index += 20) {
        const batch = selectedProducts.slice(index, index + 20);
        setImportProgressMessage(
          `Importando ${Math.min(index + 1, selectedProducts.length)}-${Math.min(index + batch.length, selectedProducts.length)} de ${selectedProducts.length} produtos...`
        );
        for (const product of batch) {
          const rawSku = String(product.sku || '');
          const sku = normalizeSkuValue(rawSku).trim();
          const skuKey = sku.toLowerCase();
          const externalId = normalizeExternalIdValue(String(product.idValue || ''));
          const productName = product.name.trim();

          if (!isValidSkuValue(rawSku)) {
            summary.invalid += 1;
            continue;
          }

          if (selectedSkus.has(skuKey)) {
            summary.repeated += 1;
            continue;
          }

          selectedSkus.add(skuKey);

          if (existingSkus.has(skuKey)) {
            summary.existing += 1;
            continue;
          }

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
                import_source: 'xml',
                category: product.category || '',
                sku: product.sku || '',
                external_id: externalId,
                xml_id: externalId,
                short_description: product.description || '',
                created_at: now,
                updated_at: now,
              } as unknown as Product,
              resolvedStoreId
            );

            await db.products.save(payload);
            existingSkus.add(sku);
            summary.imported += 1;
          } catch (error: any) {
            if (error?.code === '23505') {
              summary.existing += 1;
              continue;
            }

            summary.invalid += 1;
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
      setImportProgressMessage('');

      const messages: string[] = [];
      if (summary.imported > 0)
        messages.push(`✅ ${summary.imported} ${summary.imported === 1 ? 'produto importado' : 'produtos importados'}`);
      if (summary.existing > 0) messages.push(`⚠️ ${summary.existing} já existente(s)`);
      if (summary.repeated > 0) messages.push(`⚠️ ${summary.repeated} repetido(s) no XML`);
      if (summary.invalid > 0) messages.push(`⚠️ ${summary.invalid} sem SKU/erro`);

      if (summary.imported > 0) {
        showSuccess(messages.join('  |  '));
      } else {
        showError(messages.join('  |  ') || 'Nenhum produto importado.');
      }
    } catch (error: unknown) {
      console.error('Erro ao importar XML:', error);
      showError(error instanceof Error ? error.message : 'Erro ao importar XML.');
    } finally {
      setIsImportingXml(false);
      setImportProgressMessage('');
    }
  };

  // ─── Importação de planilha ──────────────────────────────────────

  const handleSpreadsheetImport = () => {
    if (!spreadsheetFile) {
      showError('Selecione arquivo.');
      return;
    }

    showSuccess('Importação planilha iniciada (simulação)');
    setShowImportModal(false);
  };

  const downloadTemplate = () => {
    const csv =
      'nome,categoria,preco,link,imagem_url,status\n"Vestido Floral","Vestidos",189.90,"https://loja.com/produto","https://img.com/1.jpg",ativo\n"Blusa Básica","Blusas",79.90,"https://loja.com/produto","https://img.com/2.jpg",ativo';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = 'modelo-produtos.csv';
    link.click();

    showSuccess('Modelo baixado!');
  };

  const activeCategories = categories.map(c => c.name);

  if (loading) return null;
