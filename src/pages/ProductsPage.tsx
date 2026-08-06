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
