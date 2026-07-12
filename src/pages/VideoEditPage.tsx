"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, Product, SizingModel, Story } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';
import { generateVideoThumbnail } from '@/lib/video';
import { useTenant } from '@/context/TenantContext';

const STORAGE_BUCKET = 'store-assets';

const createSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getFileExtension = (file: File, fallback: string) => {
  const extensionFromName = file.name.split('.').pop();

  if (extensionFromName) {
    return extensionFromName.toLowerCase();
  }

  if (file.type === 'video/mp4') return 'mp4';
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';

  return fallback;
};

const uploadFileToSupabase = async (
  file: File,
  storeId: string,
  folder: 'videos' | 'thumbnails',
) => {
  const fallbackExtension = folder === 'videos' ? 'mp4' : 'jpg';
  const fileExt = getFileExtension(file, fallbackExtension);
  const filePath = `${storeId}/${folder}/${Date.now()}-${createSafeId()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    console.error(`Erro ao enviar arquivo para ${folder}:`, error);
    throw error;
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

const uploadDataUrlToSupabase = async (
  dataUrl: string,
  storeId: string,
  folder: 'thumbnails',
) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const extension = blob.type === 'image/png'
    ? 'png'
    : blob.type === 'image/webp'
      ? 'webp'
      : 'jpg';

  const file = new File([blob], `thumbnail-${Date.now()}.${extension}`, {
    type: blob.type || 'image/jpeg',
  });

  return uploadFileToSupabase(file, storeId, folder);
};

const isTemporaryUrl = (url: string) => {
  return url.startsWith('blob:') || url.startsWith('data:');
};

const VideoEditPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [models, setModels] = useState<SizingModel[]>([]);
  const [usedInStories, setUsedInStories] = useState<Story[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    instagram_link: '',
    tiktok_link: '',
    thumbnail_url: '',
    product_id: '',
    model_id: '',
    active: true,
    origin: 'external_url' as 'external_url' | 'instagram' | 'youtube' | 'tiktok' | 'upload',
    video_file: null as File | null,
    thumbnail_file: null as File | null,
  });

  const isCreate = !id;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!storeId) {
          setLoading(false);
          setProductsLoading(false);
          return;
        }

        const [allModels, allProducts] = await Promise.all([
          db.sizingModels.getAll(storeId),
          db.products.getAll(storeId),
        ]);

        setModels(allModels);
        setProducts(allProducts);
        setProductsLoading(false);
        setProductsError('');

        if (!isCreate && id) {
          const v = await db.videos.getById(id, storeId);

          if (!v) {
            navigate('/gallery');
            return;
          }

          setVideo(v);

          setFormData({
            title: v.title,
            video_url: v.video_url || '',
            instagram_link: v.instagram_link || '',
            tiktok_link: v.tiktok_link || '',
            thumbnail_url: v.thumbnail_url || '',
            product_id: v.product_id || '',
            model_id: v.model_id || '',
            active: v.active ?? true,
            origin: (v.source_type as any) || 'external_url',
            video_file: null,
            thumbnail_file: null,
          });

          const storyVideos = await db.storyVideos.getAll(storeId);
          const storyIds = storyVideos
            .filter(sv => sv.video_id === id)
            .map(sv => sv.story_id);

          const stories = await db.stories.getAll(storeId);
          const usedStories = stories.filter(s => storyIds.includes(s.id));

          setUsedInStories(usedStories);
        }
      } catch (e) {
        console.error('Load error:', e);
        setProductsError('Não foi possível carregar os produtos.');
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    };

    if (!tenantLoading) {
      loadData();
    }
  }, [id, navigate, isCreate, storeId, tenantLoading]);

  const handleOriginChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      origin: e.target.value as any,
      video_url: '',
      instagram_link: '',
      tiktok_link: '',
      thumbnail_url: '',
      video_file: null,
      thumbnail_file: null,
    }));
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeVideoUrl = (value: string) => {
    try {
      const url = new URL(value.trim());

      if (url.protocol === 'blob:' || url.protocol === 'data:') {
        return value.trim();
      }

      url.hash = '';
      url.search = '';

      if (url.hostname.startsWith('www.')) {
        url.hostname = url.hostname.replace(/^www\./, '');
      }

      if (url.hostname === 'youtu.be' && !url.pathname.endsWith('/')) {
        url.pathname = url.pathname.replace(/\/+$/, '');
      }

      return url.toString().replace(/\/$/, '');
    } catch {
      return value.trim();
    }
  };

  const validateInstagramLink = (link: string): boolean => {
    if (!link) return false;

    try {
      const url = new URL(link.trim());
      const host = url.hostname.replace(/^www\./, '').toLowerCase();

      if (host !== 'instagram.com') return false;

      return /^\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  };

  const validateTikTokLink = (link: string): boolean => {
    if (!link) return false;

    try {
      const url = new URL(link.trim());
      const host = url.hostname.replace(/^www\./, '').toLowerCase();

      if (host === 'vm.tiktok.com') {
        return /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
      }

      if (host !== 'tiktok.com') return false;

      return /^\/@[A-Za-z0-9._-]+\/video\/\d+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  };

  const validateYouTubeLink = (link: string): boolean => {
    if (!link) return false;

    try {
      const url = new URL(link.trim());
      const host = url.hostname.replace(/^www\./, '').toLowerCase();

      if (host === 'youtu.be') {
