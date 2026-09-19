import { useNavigate } from "react-router-dom";
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
  Ruler,
} from 'lucide-react';

import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { db, Product, resolveStoreId, withStoreId, generateUuid } from '@/lib/db';
import { logPanelActivity } from '@/lib/activityLog';

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
  const navigate = useNavigate();
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

  // Filtro "sem vídeo" via query param
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

  useEffect(() => {
    const load = async () => {
      try {
        const resolvedStoreId = await resolveStoreId(storeId);
        const allProducts = await db.products.getAll(resolvedStoreId);
        setProducts(allProducts);

        // Lê query param ?sem-video=true
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || (p as any).category === filterCategory;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? (p as any).active : !(p as any).active);
      const matchesOrigin = filterOrigin === 'all' || (p as any).origin === filterOrigin;

      // Filtro de vídeo
      const hasVideo = !!(p as any).video;
      const matchesVideo = filterVideo === 'all'
        || (filterVideo === 'with' && hasVideo)
        || (filterVideo === 'without' && !hasVideo);

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
        logPanelActivity('product.updated', formData.name, resolvedStoreId);

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
        logPanelActivity('product.created', formData.name, resolvedStoreId);

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
        logPanelActivity('product.deleted', `${ids.length} ${ids.length === 1 ? 'produto' : 'produtos'} (exclusão em massa)`);
        setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
        showSuccess(`${ids.length} ${ids.length === 1 ? 'produto removido' : 'produtos removidos'}.`);
      } else {
        await db.products.delete(deleteModal.productId);
        logPanelActivity('product.deleted', deleteModal.productTitle);
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
      logPanelActivity(nextActive ? 'product.activated' : 'product.deactivated', product.name, resolvedStoreId);

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
      if (summary.imported > 0) {
        logPanelActivity('product.imported', `${summary.imported} ${summary.imported === 1 ? 'produto importado do XML' : 'produtos importados do XML'}`, resolvedStoreId);
      }
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

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA (Sincronizado perfeitamente com os outros) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Produtos
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
            Gerencie o catálogo de produtos da sua loja e seus vínculos com os vídeos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openNewProduct}
            className="flex items-center gap-2 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus size={16} className="!text-white stroke-[2.5]" />
            Novo produto
          </button>
          
          <button
            type="button"
            onClick={() => setShowCategoriesModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] shadow-sm hover:border-[#0091ff] dark:hover:border-[#ff7a29]/50 transition-all cursor-pointer"
          >
            <Tag size={15} className="text-[#0091ff] dark:text-[#ff7a29]" />
            Categorias
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#e8ecf4] shadow-sm hover:border-[#0091ff] dark:hover:border-[#ff7a29]/50 transition-all cursor-pointer"
          >
            <Upload size={15} className="text-[#0091ff] dark:text-[#ff7a29]" />
            Importar produtos
          </button>
        </div>
      </div>

      {/* ── ABAS: PRODUTOS / MEDIDAS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => navigate('/produtos')}
          className="flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 border-[#0091ff] dark:border-[#ff7a29] text-[#0091ff] dark:text-[#ff7a29] transition-colors cursor-pointer"
        >
          <Package size={15} />
          Produtos
        </button>
        <button
          type="button"
          onClick={() => navigate('/medidas')}
          className="flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 border-transparent text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Ruler size={15} />
          Medidas
        </button>
      </div>

      {/* ── CARD PRINCIPAL UNIFICADO (Filtros, Busca e Tabela em um só bloco) ── */}
      <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-2xl overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* BARRA INTERNA DE FILTROS E BUSCA (Estilo unificado pílulas soltas) */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-white/5 pb-5">
          
          {/* Input de Busca Flexível */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8a90a0]" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome do produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#111524] pl-12 pr-4 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] focus:bg-white dark:focus:bg-[#111524] transition-all"
            />
          </div>

          {/* DROPDOWNS EM ESTILO PÍLULA INDEPENDENTE (Padrão exato de Stories) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-[#F8FAFC] dark:bg-[#111524] border border-transparent dark:border-white/5 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0] outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] cursor-pointer w-full sm:w-auto hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <option value="all">Todas Categorias</option>
              {activeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#F8FAFC] dark:bg-[#111524] border border-transparent dark:border-white/5 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0] outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] cursor-pointer w-full sm:w-auto hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Desativados</option>
            </select>

            <select
              value={filterOrigin}
              onChange={e => setFilterOrigin(e.target.value)}
              className="bg-[#F8FAFC] dark:bg-[#111524] border border-transparent dark:border-white/5 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0] outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] cursor-pointer w-full sm:w-auto hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <option value="all">Todas Origens</option>
              <option value="manual">Manual</option>
              <option value="xml">XML</option>
              <option value="planilha">Planilha</option>
            </select>
          </div>
        </div>

        {/* Badge de filtro ativo: Sem vídeo */}
        {filterVideo === 'without' && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/40 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
              Filtrando: produtos sem vídeo
              <button
                type="button"
                onClick={() => setFilterVideo('all')}
                className="text-amber-400 hover:text-amber-600 ml-1 cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        {/* ── BARRA INTERNA DE SELEÇÃO, QUANTIDADE E CONTROLE DE PAGINAÇÃO ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#111524]/40 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0]">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
            {selectedIds.size > 0 && (
              <span className="rounded-full bg-[#0091ff]/10 dark:bg-[#ff7a29]/15 border border-[#0091ff]/30 dark:border-[#ff7a29]/30 px-3 py-0.5 text-xs font-black text-[#0091ff] dark:text-[#ff7a29]">
                {selectedIds.size} selecionados
              </span>
            )}
            {!allFilteredSelected && selectedIds.size > 0 && selectedIds.size < filteredProducts.length && (
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs font-black text-[#0091ff] dark:text-[#ff7a29] underline hover:opacity-80 transition-all cursor-pointer"
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
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-black text-rose-500 transition-all hover:bg-rose-500/20 cursor-pointer"
              >
                <Trash2 size={14} />
                Excluir {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">Itens por página:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111524] px-3 py-1.5 text-xs font-black text-slate-700 dark:text-white outline-none focus:border-[#0091ff] dark:focus:border-[#ff7a29]"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABELA DE PRODUTOS */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#111524]/50 text-[10px] font-black uppercase text-slate-400 dark:text-[#8a90a0] tracking-widest">
                <th className="px-4 py-4 text-center w-[48px] rounded-l-2xl">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 dark:border-slate-600 text-[#ff7a29] focus:ring-[#ff7a29]"
                  />
                </th>

                <th className="px-4 py-4 text-center w-[76px]">
                  Foto
                </th>

                <th
                  onClick={() => handleSort('produto')}
                  className="cursor-pointer select-none px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Produto</span>
                    {sortColumn === 'produto' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('preco')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-32"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Preço</span>
                    {sortColumn === 'preco' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('categoria')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-36"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Categoria</span>
                    {sortColumn === 'categoria' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('video')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-44"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Vídeo Vinculado</span>
                    {sortColumn === 'video' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('origem')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-28"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Origem</span>
                    {sortColumn === 'origem' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  className="cursor-pointer select-none px-4 py-4 text-center w-28"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    {sortColumn === 'status' &&
                      (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                <th className="px-4 py-4 text-center w-36 rounded-r-2xl">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {pagedProducts.map(product => (
                <tr
                  key={product.id}
                  className={cn(
                    'transition-colors',
                    selectedIds.has(product.id)
                      ? 'bg-[#0091ff]/10 dark:bg-orange-500/15'
                      : 'hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'
                  )}
                >
                  <td className="px-4 py-3.5 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelectOne(product.id)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 dark:border-slate-600 text-[#0091ff] dark:text-[#ff7a29] focus:ring-[#0091ff]"
                    />
                  </td>

                  <td className="px-4 py-3.5 align-middle">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
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
                        <Package size={18} className="text-slate-400 dark:text-[#8a90a0]" />
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <p className="font-black text-xs text-slate-800 dark:text-[#e8ecf4] truncate max-w-xs" title={product.name}>
                      {product.name}
                    </p>
                  </td>

                  <td className="px-4 py-3.5 text-center font-mono font-black text-xs text-slate-900 dark:text-white">
                    {Number(product.price || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#111524] text-slate-700 dark:text-[#c0c5d4] text-[11px] font-bold border border-slate-200/60 dark:border-white/5 max-w-full truncate">
                      <Tag size={11} className="text-[#0091ff] dark:text-[#ff7a29] shrink-0" />
                      <span className="truncate">{(product as any).category || 'Sem categoria'}</span>
                    </span>
                  </td>
                  
                  <td className="px-4 py-3.5 text-center">
                    {(product as any).video ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 text-[#0091ff] dark:text-[#ff7a29] text-xs font-bold truncate">
                        {(product as any).video}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-[#8a90a0] text-xs italic">Nenhum</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center text-center w-full">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                          (product as any).origin === 'manual'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40'
                            : (product as any).origin === 'planilha'
                            ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-800/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40'
                        )}
                      >
                        {(product as any).origin === 'manual' ? (
                          <Tag size={10} />
                        ) : (
                          <Globe size={10} />
                        )}
                        {(product as any).origin === 'manual'
                          ? 'Manual'
                          : (product as any).origin === 'planilha'
                          ? 'Planilha'
                          : 'XML'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center text-center w-full">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(product)}
                        className={cn(
                          'inline-flex h-7 w-[100px] items-center justify-center rounded-xl px-2.5 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all',
                          product.active
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100'
                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-100'
                        )}
                      >
                        {product.active ? 'ATIVO' : 'DESATIVADO'}
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditProduct(product)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-[#0091ff] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                        title="Editar produto"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(product)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                        title="Excluir produto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pagedProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={40} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhum produto encontrado</p>
                      <p className="text-xs text-slate-400 dark:text-[#8a90a0]">
                        {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterOrigin !== 'all' || filterVideo !== 'all'
                          ? 'Tente ajustar os filtros acima.'
                          : 'Clique em "Novo produto" para cadastrar seu primeiro item.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 pt-4 px-2">
            <p className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">
              Página {safePage} de {totalPages}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded-xl bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/5 px-3 py-1.5 text-xs font-black text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer',
                    page === safePage
                      ? 'bg-[#0091ff] dark:bg-[#ff7a29] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  )}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded-xl bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/5 px-3 py-1.5 text-xs font-black text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Produto (Novo/Editar) */}
      {showProductModal && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#ff7a29]/20 p-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingProduct ? 'Editar produto' : 'Novo produto'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="rounded-xl bg-slate-100 dark:bg-[#1a1f35] p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5">
              {/* Imagem */}
              <div>
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">Imagem do produto</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <Image size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-[#0091ff] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white file:transition file:hover:bg-[#0070f3] file:cursor-pointer"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">JPG, PNG ou WEBP. Máx. 350 KB.</p>
                    {formData.image_error && (
                      <p className="mt-1 text-xs font-bold text-red-500">{formData.image_error}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">Nome do produto *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
                  placeholder="Ex: Vestido Floral"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff] cursor-pointer"
                >
                  <option value="">Selecione uma categoria</option>
                  {activeCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Preço */}
              <div>
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
                  placeholder="0,00"
                />
              </div>

              {/* URL do produto */}
              <div>
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">Link do produto</label>
                <input
                  type="url"
                  value={formData.product_url}
                  onChange={e => setFormData(prev => ({ ...prev, product_url: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
                  placeholder="https://sualoja.com/produto"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300">Produto ativo?</label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                  className={cn(
                    'relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer',
                    formData.active ? 'bg-emerald-500' : 'bg-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                      formData.active ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {formData.active ? 'Ativo' : 'Desativado'}
                </span>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#ff7a29]/20">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl bg-slate-100 dark:bg-[#1a1f35] px-5 py-2.5 text-sm font-black text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0091ff] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#0070f3] disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingProduct ? 'Atualizar' : 'Criar produto'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Categorias */}
      {showCategoriesModal && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#ff7a29]/20 p-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Categorias</h2>
              <button
                type="button"
                onClick={() => setShowCategoriesModal(false)}
                className="rounded-xl bg-slate-100 dark:bg-[#1a1f35] p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Adicionar nova */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={catNewName}
                  onChange={e => setCatNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCatAdd()}
                  placeholder="Nova categoria..."
                  className="flex-1 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
                />
                <button
                  type="button"
                  onClick={handleCatAdd}
                  className="rounded-xl bg-[#0091ff] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0070f3] cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-[#ff7a29]/20 bg-slate-50 dark:bg-[#111524] px-4 py-3"
                  >
                    {catEditingId === cat.id ? (
                      <input
                        type="text"
                        value={catEditName}
                        onChange={e => setCatEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCatEditSave(cat.id);
                          if (e.key === 'Escape') setCatEditingId(null);
                        }}
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#0091ff]"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-700 dark:text-white">{cat.name}</span>
                    )}

                    <div className="flex items-center gap-1">
                      {catEditingId === cat.id ? (
                        <button
                          type="button"
                          onClick={() => handleCatEditSave(cat.id)}
                          className="rounded-xl p-1.5 text-emerald-600 transition hover:bg-emerald-50 cursor-pointer"
                        >
                          <Save size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCatEditStart(cat)}
                          className="rounded-xl p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCatDelete(cat.id)}
                        className="rounded-xl p-1.5 text-rose-400 transition hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {categories.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">Nenhuma categoria cadastrada.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCatSaveAll}
                  className="rounded-xl bg-[#0091ff] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#0070f3] cursor-pointer"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {showImportModal && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#ff7a29]/20 p-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Importar produtos</h2>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportedXmlProducts([]);
                  setSelectedXmlKeys(new Set());
                }}
                className="rounded-xl bg-slate-100 dark:bg-[#1a1f35] p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-[#ff7a29]/20">
              <button
                type="button"
                onClick={() => setImportTab('xml')}
                className={cn(
                  'flex-1 py-3 text-sm font-black transition cursor-pointer',
                  importTab === 'xml'
                    ? 'border-b-2 border-[#0091ff] text-[#0091ff]'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                )}
              >
                <FileText size={14} className="inline mr-1.5" />
                XML
              </button>
              <button
                type="button"
                onClick={() => setImportTab('sheet')}
                className={cn(
                  'flex-1 py-3 text-sm font-black transition cursor-pointer',
                  importTab === 'sheet'
                    ? 'border-b-2 border-[#0091ff] text-[#0091ff]'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                )}
              >
                <Upload size={14} className="inline mr-1.5" />
                Planilha
              </button>
            </div>

            {/* Conteúdo da tab XML */}
            {importTab === 'xml' && (
              <div className="p-6 space-y-6">
                {importedXmlProducts.length === 0 ? (
                  <>
                    {/* Input: URL */}
                    <div>
                      <label className="text-sm font-black text-slate-700 dark:text-slate-300">URL do feed XML</label>
                      <div className="mt-2 flex gap-2">
                        <div className="relative flex-1">
                          <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            value={xmlUrl}
                            onChange={e => setXmlUrl(e.target.value)}
                            placeholder="https://sualoja.com/feed.xml"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-100 dark:border-[#ff7a29]/30 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ou arquivo */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 border-t border-slate-200 dark:border-[#ff7a29]/20" />
                      <span className="text-xs font-black text-slate-400 uppercase">ou</span>
                      <div className="flex-1 border-t border-slate-200 dark:border-[#ff7a29]/20" />
                    </div>

                    <div>
                      <label className="text-sm font-black text-slate-700 dark:text-slate-300">Arquivo XML</label>
                      <input
                        type="file"
                        accept=".xml"
                        onChange={e => setXmlFile(e.target.files?.[0] || null)}
                        className="mt-2 w-full text-xs font-medium text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-[#0091ff] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white file:transition file:hover:bg-[#0070f3] file:cursor-pointer"
                      />
                    </div>

                    {/* Botão de leitura */}
                    <button
                      type="button"
                      onClick={readXmlFeed}
                      disabled={isImportingXml}
                      className="w-full rounded-xl bg-[#0091ff] py-3 text-sm font-black text-white transition hover:bg-[#0070f3] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isImportingXml ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {importProgressMessage}
                        </>
                      ) : (
                        'Ler feed XML'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Preview com seleção */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {totalXmlProducts} produtos encontrados
                          </p>
                          {selectedXmlCount > 0 && (
                            <p className="text-xs font-bold text-[#0091ff] mt-0.5">
                              {selectedXmlCount} selecionados
                            </p>
                          )}
                        </div>

                        {/* Filtros e Ajuste de Paginação do Preview XML */}
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Buscar..."
                            value={xmlPreviewSearch}
                            onChange={e => {
                              setXmlPreviewSearch(e.target.value);
                              setXmlPreviewPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold outline-none focus:border-[#0091ff] w-40 dark:bg-[#111524] dark:border-white/5 dark:text-white"
                          />
                          <select
                            value={xmlPreviewCategory}
                            onChange={e => {
                              setXmlPreviewCategory(e.target.value);
                              setXmlPreviewPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold outline-none focus:border-[#0091ff] dark:bg-[#111524] dark:border-white/5 dark:text-[#e8ecf4] cursor-pointer"
                          >
                            <option value="all">Todas categorias</option>
                            {xmlPreviewCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>

                          {/* Seletor dinâmico de Paginação (10, 50 ou 100) */}
                          <select
                            value={xmlPreviewPageSize}
                            onChange={e => {
                              setXmlPreviewPageSize(Number(e.target.value));
                              setXmlPreviewPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black outline-none focus:border-[#0091ff] dark:bg-[#111524] dark:border-white/5 dark:text-[#e8ecf4] cursor-pointer"
                          >
                            <option value={10}>10 por pág.</option>
                            <option value={50}>50 por pág.</option>
                            <option value={100}>100 por pág.</option>
                          </select>
                        </div>
                      </div>

                      {/* Selecionar todos */}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={e => toggleSelectAllVisibleXml(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#0091ff] focus:ring-[#0091ff]"
                          />
                          Selecionar visíveis
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleSelectAllXml(true)}
                          className="text-xs font-bold text-[#0091ff] underline hover:text-[#0070f3] cursor-pointer"
                        >
                          Selecionar todos ({totalXmlProducts})
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSelectAllXml(false)}
                          className="text-xs font-bold text-slate-400 dark:text-slate-500 underline hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          Limpar seleção
                        </button>
                      </div>

                      {/* Tabela preview */}
                      <div className="border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-[#111524] sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 w-8 bg-slate-50 dark:bg-[#111524]"></th>
                              <th className="px-3 py-2 font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111524]">Produto</th>
                              <th className="px-3 py-2 font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111524]">SKU</th>
                              <th className="px-3 py-2 font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111524]">Preço</th>
                              <th className="px-3 py-2 font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111524]">Categoria</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {xmlPreviewPageItems.map((product, idx) => {
                              const key = getXmlProductKey(product);
                              return (
                                <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedXmlKeys.has(key)}
                                      onChange={e => setSelectedXmlProduct(product, e.target.checked)}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#0091ff] focus:ring-[#0091ff]"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-bold text-slate-700 dark:text-white truncate max-w-[200px]">
                                    {product.name}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 font-medium">
                                    {product.sku || '-'}
                                  </td>
                                  <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">
                                    {Number(product.price || 0).toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                    {formatXmlCategory(product.category || 'Sem categoria')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginação do preview */}
                      {totalXmlPages > 1 && (
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            disabled={xmlPreviewPage <= 1}
                            onClick={() => setXmlPreviewPage(p => p - 1)}
                            className="text-xs font-bold text-[#0091ff] disabled:opacity-30 cursor-pointer"
                          >
                            ← Anterior
                          </button>
                          <span className="text-xs text-slate-400">
                            {safeXmlPreviewPage} / {totalXmlPages}
                          </span>
                          <button
                            type="button"
                            disabled={xmlPreviewPage >= totalXmlPages}
                            onClick={() => setXmlPreviewPage(p => p + 1)}
                            className="text-xs font-bold text-[#0091ff] disabled:opacity-30 cursor-pointer"
                          >
                            Próximo →
                          </button>
                        </div>
                      )}

                      {/* Botões de ação */}
                      <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-[#ff7a29]/20">
                        <button
                          type="button"
                          onClick={() => {
                            setImportedXmlProducts([]);
                            setSelectedXmlKeys(new Set());
                          }}
                          className="flex-1 rounded-xl bg-slate-100 dark:bg-[#1a1f35] py-2.5 text-sm font-black text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 cursor-pointer"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleXmlImportSelected}
                          disabled={isImportingXml || selectedXmlCount === 0}
                          className="flex-1 rounded-xl bg-[#0091ff] py-2.5 text-sm font-black text-white transition hover:bg-[#0070f3] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isImportingXml ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              {importProgressMessage}
                            </>
                          ) : (
                            `Importar ${selectedXmlCount > 0 ? `(${selectedXmlCount})` : ''}`
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Conteúdo da tab Planilha */}
            {importTab === 'sheet' && (
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-black text-slate-700 dark:text-slate-300">Arquivo CSV/Planilha</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={e => setSpreadsheetFile(e.target.files?.[0] || null)}
                    className="mt-2 w-full text-xs font-medium text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-[#0091ff] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white file:transition file:hover:bg-[#0070f3] file:cursor-pointer"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/20 bg-slate-50 dark:bg-[#111524] p-4">
                  <p className="text-sm font-black text-slate-700 dark:text-white">Baixar modelo</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Use o modelo para preencher os dados corretamente.
                  </p>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#1a1f35] px-3 py-1.5 text-xs font-black text-[#0091ff] border border-slate-200 transition hover:bg-slate-100 cursor-pointer"
                  >
                    <Upload size={12} />
                    Baixar modelo CSV
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSpreadsheetImport}
                  disabled={!spreadsheetFile}
                  className="w-full rounded-xl bg-[#0091ff] py-3 text-sm font-black text-white transition hover:bg-[#0070f3] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Importar planilha
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title={deleteModal.bulkMode ? 'Excluir produtos' : 'Excluir produto'}
        message={
          deleteModal.bulkMode
            ? `Tem certeza que deseja excluir ${deleteModal.productTitle}? Esta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir "${deleteModal.productTitle}"? Esta ação não pode ser desfeita.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ProductsPage;
