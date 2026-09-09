import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Eye,
  Calendar,
  DollarSign,
  HardDrive,
  FileText,
  Clock,
  Play,
  Share2,
  Check,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  Video as VideoIcon,
  Settings,
  Palette,
  Star,
  Power,
  Upload,
  Code2,
  Activity,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Store as StoreIcon,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

interface StoreUsageData {
  planName: string;
  subscriptionStatus: string;
  trialDaysLeft: number | null;
  currentPeriodEnd: string | null;
  viewsUsed: number;
  viewsLimit: number;
  storageUsedMB: number;
  storageLimitMB: number;
  pagesUsed: number;
  pagesLimit: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
  percent?: number;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // 🛡️ Hooks de Contexto e Autenticação
  const { storeId } = useTenant();
  const { loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [appEnabled, setAppEnabled] = useState<boolean>(true);

  // Métricas financeiras
  const [videoRevenue, setVideoRevenue] = useState<number>(0);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);

  const [usage, setUsage] = useState<StoreUsageData>({
    planName: 'Starter',
    subscriptionStatus: 'trialing',
    trialDaysLeft: 7,
    currentPeriodEnd: null,
    viewsUsed: 0,
    viewsLimit: 10000,
    storageUsedMB: 0,
    storageLimitMB: 2048,
    pagesUsed: 0,
    pagesLimit: 5,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // ── Checklist Inicial (6 Passos) ──
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'settings', title: 'Configurações da loja', description: 'Preencha os dados cadastrais, e-mail e integre seu canal de WhatsApp.', route: '/settings', completed: false },
    { id: 'integration', title: 'Instalação do script', description: 'Copie e instale o script de embed nas plataformas ou via GTM.', route: '/integration', completed: false },
    { id: 'products', title: 'Vincular os produtos', description: 'Vincule produtos com preço para permitir compra direta através dos vídeos.', route: '/products', completed: false },
    { id: 'videos', title: 'Subir vídeos', description: 'Suba seus vídeos verticais ou importe do Instagram/TikTok.', route: '/videos', completed: false },
    { id: 'stories', title: 'Criar coleção de Stories', description: 'Agrupe seus vídeos em coleções interativas.', route: '/stories', completed: false },
    { id: 'appearance', title: 'Configurar a aparência', description: 'Personalize cores, fontes, bordas e botões do player de stories.', route: '/appearance', completed: false },
  ]);

  // Carregamento Estrutural da Loja e Métricas
  useEffect(() => {
    if (!storeId || authLoading) return;
    let isMounted = true;

    const loadStoreStructure = async () => {
      try {
        setLoading(true);

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        const results = await Promise.allSettled([
          db.videos.getAll(storeId), // [0]
          supabase.from('stores').select('*, plans(*)').eq('id', storeId).single(), // [1]
          supabase.from('usage_counters').select('*').eq('store_id', storeId).eq('month', currentMonth).maybeSingle(), // [2]
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId), // [3]
          supabase.from('stories').select('id', { count: 'exact', head: true }).eq('store_id', storeId), // [4]
          supabase.from('appearances').select('id', { count: 'exact', head: true }).eq('store_id', storeId), // [5]
          supabase.from('display_locations').select('id', { count: 'exact', head: true }).eq('store_id', storeId), // [6]
          supabase.from('activity_logs').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(15), // [7]
          supabase.from('store_settings').select('*').eq('store_id', storeId).maybeSingle(), // [8]
          supabase.from('referral_rewards').select('amount').eq('referrer_store_id', storeId).eq('status', 'paid'), // [9]
          supabase.from('video_events').select('order_value').eq('store_id', storeId).eq('event_type', 'conversion'), // [10]
        ]);

        if (!isMounted) return;

        const [
          videosRes,
          storeRes,
          usageCounterRes,
          productsRes,
          storiesRes,
          appearanceRes,
          locationsRes,
          eventsRes,
          settingsRes,
          referralRes,
          conversionsRes,
        ] = results;

        // 1. Vídeos
        const fetchedVideos: Video[] = videosRes.status === 'fulfilled' ? videosRes.value : [];

        // 2. Loja
        const storeData = storeRes.status === 'fulfilled' ? storeRes.value.data || {} : {};
        setStoreName(storeData.name || '');
        setReferralCode(storeData.referral_code || '');

        let trialDays: number | null = null;
        if (storeData.subscription_status === 'trialing' && storeData.trial_ends_at) {
          const diff = new Date(storeData.trial_ends_at).getTime() - Date.now();
          trialDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        // 3. Quotas e Contadores
        const usageData = usageCounterRes.status === 'fulfilled' ? usageCounterRes.value.data || {} : {};
        const storeDataObj = storeData as any;
        const planData = storeDataObj.plans || {};

        const realStorageUsedBytes = storeDataObj.storage_used_bytes !== null && storeDataObj.storage_used_bytes !== undefined
          ? Number(storeDataObj.storage_used_bytes)
          : 0;
        const realStorageUsedMB = Number((realStorageUsedBytes / (1024 * 1024)).toFixed(1));

        const realStorageLimitBytes = storeDataObj.storage_limit_bytes
          ? Number(storeDataObj.storage_limit_bytes)
          : (planData.storage_limit_bytes ? Number(planData.storage_limit_bytes) : 1024 * 1024 * 1024);
        const realStorageLimitMB = Number((realStorageLimitBytes / (1024 * 1024)).toFixed(0));

        const pagesCount = locationsRes.status === 'fulfilled' ? locationsRes.value.count || 0 : 0;
        const resolvedViewsLimit = storeDataObj.views_limit || planData.views_limit || 10000;
        const resolvedPagesLimit = storeDataObj.pages_limit || planData.pages_limit || 5;
        const resolvedPlanName = planData.name || storeDataObj.plan_tier || 'Starter';

        setUsage({
          planName: String(resolvedPlanName).toUpperCase(),
          subscriptionStatus: storeDataObj.subscription_status || 'trialing',
          trialDaysLeft: trialDays,
          currentPeriodEnd: storeDataObj.current_period_end || storeDataObj.trial_ends_at,
          viewsUsed: usageData.views_count || 0,
          viewsLimit: resolvedViewsLimit,
          storageUsedMB: realStorageUsedMB,
          storageLimitMB: realStorageLimitMB,
          pagesUsed: pagesCount,
          pagesLimit: resolvedPagesLimit,
        });

        // 4. Feed de Eventos
        let fetchedEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.data || [] : [];

        // Marco Zero: se não houver atividades registradas ou se não houver o evento inicial de criação,
        // garantimos a exibição elegante de "Loja criada com sucesso" com a data/hora real de criação da loja
        const storeCreatedAt = storeData?.created_at || new Date().toISOString();
        const hasCreationLog = fetchedEvents.some((ev: any) => ev.action === 'store.created');

        if (!hasCreationLog) {
          fetchedEvents = [
            ...fetchedEvents,
            {
              id: 'initial-store-creation',
              store_id: storeId,
              user_id: null,
              action: 'store.created',
              details: storeData?.name || 'Conta Vidlytics ativada',
              created_at: storeCreatedAt,
            },
          ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        setActivities(fetchedEvents);

        // 5. Checklist
        const productsCount = productsRes.status === 'fulfilled' ? productsRes.value.count || 0 : 0;
        const storiesCount = storiesRes.status === 'fulfilled' ? storiesRes.value.count || 0 : 0;
        const appearanceCount = appearanceRes.status === 'fulfilled' ? appearanceRes.value.count || 0 : 0;
        const settingsData = settingsRes.status === 'fulfilled' ? settingsRes.value.data || {} : {};
        setAppEnabled(settingsData.widget_enabled !== false);

        // 5. Checklist — Verificação estrita de completude das Configurações
        const hasStoreName = Boolean(storeData?.name && storeData.name.trim().length > 0);
        const hasContactEmail = Boolean(settingsData?.contact_email && settingsData.contact_email.trim().length > 3);
        const hasPlatform = Boolean(settingsData?.platform && settingsData.platform !== 'none' && settingsData.platform.trim().length > 0);
        const hasSector = Boolean(storeData?.sector_id || storeData?.sector);

        // WhatsApp: se estiver ativo, precisa ter ao menos 8 dígitos numéricos
        const hasWhatsapp = settingsData?.whatsapp_enabled === false
          ? true
          : Boolean(settingsData?.whatsapp_number && settingsData.whatsapp_number.replace(/\D/g, '').length >= 8);

        // Percentual granular: cada campo essencial vale igualmente
        const settingsChecks = [hasStoreName, hasContactEmail, hasPlatform, hasSector, hasWhatsapp];
        const settingsPercent = Math.round(
          (settingsChecks.filter(Boolean).length / settingsChecks.length) * 100,
        );
        const hasSettingsSaved = settingsPercent === 100;

        // Lista dinâmica dos campos pendentes para orientar o lojista
        const missingSettings: string[] = [];
        if (!hasStoreName) missingSettings.push('Nome da loja');
        if (!hasContactEmail) missingSettings.push('E-mail de contato');
        if (!hasPlatform) missingSettings.push('Plataforma');
        if (!hasSector) missingSettings.push('Setor');
        if (!hasWhatsapp) missingSettings.push('WhatsApp');

        const settingsDescription = !hasSettingsSaved && missingSettings.length > 0
          ? `${settingsPercent}% concluído — pendente: ${missingSettings.join(', ')}.`
          : 'Preencha os dados cadastrais, e-mail e integre seu canal de WhatsApp.';

        const isIntegrationCompleted = pagesCount > 0 || (usageData && (usageData.views_count || 0) > 0);

        setChecklist([
          {
            id: 'settings',
            title: 'Configurações da loja',
            description: settingsDescription,
            route: '/settings',
            completed: hasSettingsSaved,
            percent: settingsPercent,
          },
          {
            id: 'integration',
            title: 'Instalação do script',
            description: 'Copie e instale o script de embed nas plataformas ou via GTM.',
            route: '/integration',
            completed: isIntegrationCompleted,
          },

          {
            id: 'products',
            title: 'Vincular os produtos',
            description: 'Vincule produtos com preço para permitir compra direta através dos vídeos.',
            route: '/products',
            completed: productsCount > 0,
          },
          {
            id: 'videos',
            title: 'Subir vídeos',
            description: 'Suba seus vídeos verticais ou importe do Instagram/TikTok.',
            route: '/videos',
            completed: fetchedVideos.length > 0,
          },
          {
            id: 'stories',
            title: 'Criar coleção de Stories',
            description: 'Agrupe seus vídeos em coleções interativas.',
            route: '/stories',
            completed: storiesCount > 0,
          },
          {
            id: 'appearance',
            title: 'Configurar a aparência',
            description: 'Personalize cores, fontes, bordas e botões do player de stories.',
            route: '/appearance',
            completed: appearanceCount > 0,
          },
        ]);

        // 6. Faturamento com indicações
        if (referralRes.status === 'fulfilled' && referralRes.value.data) {
          const totalRef = referralRes.value.data.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
          setReferralEarnings(totalRef);
        }

        // 7. Faturamento de vendas dos vídeos
        if (conversionsRes.status === 'fulfilled' && conversionsRes.value.data) {
          const totalConv = conversionsRes.value.data.reduce((acc: number, item: any) => acc + (Number(item.order_value) || 0), 0);
          setVideoRevenue(totalConv);
        }
      } catch (err) {
        console.error('[DashboardPage] Erro ao carregar dados:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStoreStructure();

    return () => {
      isMounted = false;
    };
  }, [storeId, authLoading]);

  const handleCopyReferral = async () => {
    const code = referralCode || storeId;
    const referralUrl = `${window.location.origin}/register?ref=${code}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopiedReferral(true);
      toast.success('Link de indicação copiado!');
      setTimeout(() => setCopiedReferral(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o link automaticamente.');
    }
  };

  const calcPercent = (current: number, max: number) => {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const viewsPercent = calcPercent(usage.viewsUsed, usage.viewsLimit);
  const storagePercent = calcPercent(usage.storageUsedMB, usage.storageLimitMB);
  const pagesPercent = calcPercent(usage.pagesUsed, usage.pagesLimit);

  const completedSteps = checklist.filter((item) => item.completed).length;
  const checklistPercent = Math.round((completedSteps / checklist.length) * 100);

  const getBarColor = (pct: number) => {
    if (pct >= 90) return '!bg-[#ef4444]';
    if (pct >= 75) return '!bg-[#ff7a29]';
    return '!bg-[#22c55e]';
  };

  const CHIP = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
    blue: 'bg-blue-50 dark:bg-blue-950/40 text-[#0091ff] dark:text-[#ff7a29] border border-blue-100 dark:border-orange-500/20',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
    cyan: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30',
    violet: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30',
    slate: 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/30',
  };

  const ACTION_META: Record<string, { Icon: any; label: string; chip: string }> = {
    // 🏪 Loja
    'store.created': { Icon: StoreIcon, label: 'Loja criada com sucesso', chip: CHIP.emerald },
    'store.updated': { Icon: Settings, label: 'Dados da loja atualizados', chip: CHIP.blue },

    // 🎬 Vídeos
    'video.created': { Icon: Plus, label: 'Novo vídeo adicionado', chip: CHIP.emerald },
    'video.updated': { Icon: Pencil, label: 'Vídeo atualizado', chip: CHIP.blue },
    'video.deleted': { Icon: Trash2, label: 'Vídeo excluído', chip: CHIP.rose },

    // 📱 Stories
    'story.created': { Icon: Plus, label: 'Coleção de stories criada', chip: CHIP.emerald },
    'story.updated': { Icon: Pencil, label: 'Coleção de stories atualizada', chip: CHIP.violet },
    'story.deleted': { Icon: Trash2, label: 'Coleção de stories excluída', chip: CHIP.rose },
    'story.activated': { Icon: Power, label: 'Coleção ativada na loja', chip: CHIP.emerald },
    'story.deactivated': { Icon: Power, label: 'Coleção pausada na loja', chip: CHIP.slate },

    // 🛍️ Produtos
    'product.created': { Icon: Plus, label: 'Produto cadastrado', chip: CHIP.emerald },
    'product.updated': { Icon: Pencil, label: 'Produto atualizado', chip: CHIP.blue },
    'product.activated': { Icon: Power, label: 'Produto ativado', chip: CHIP.emerald },
    'product.deactivated': { Icon: Power, label: 'Produto desativado', chip: CHIP.slate },
    'product.deleted': { Icon: Trash2, label: 'Produto excluído', chip: CHIP.rose },
    'product.imported': { Icon: Upload, label: 'Produtos importados com sucesso', chip: CHIP.emerald },

    // 📏 Medidas
    'model.created': { Icon: Plus, label: 'Tabela de medidas criada', chip: CHIP.emerald },
    'model.updated': { Icon: Pencil, label: 'Tabela de medidas atualizada', chip: CHIP.blue },
    'model.deleted': { Icon: Trash2, label: 'Tabela de medidas excluída', chip: CHIP.rose },

    // ⚙️ Configurações
    'settings.saved': { Icon: Settings, label: 'Configurações da loja salvas', chip: CHIP.amber },

    // 🎨 Aparências
    'appearance.created': { Icon: Plus, label: 'Novo estilo visual criado', chip: CHIP.emerald },
    'appearance.updated': { Icon: Palette, label: 'Aparência do player atualizada', chip: CHIP.cyan },
    'appearance.default': { Icon: Star, label: 'Aparência definida como padrão', chip: CHIP.amber },
    'appearance.deleted': { Icon: Trash2, label: 'Aparência excluída', chip: CHIP.rose },

    // 💾 Armazenamento e comentários
    'storage.file_deleted': { Icon: HardDrive, label: 'Arquivo removido do armazenamento', chip: CHIP.rose },
    'comment.deleted': { Icon: Trash2, label: 'Comentário removido', chip: CHIP.rose },
  };

  const getActivityMeta = (action: string, details: string = '') => {
    const known = ACTION_META[action];
    if (known) return known;

    const act = action.toLowerCase();
    const det = details.toLowerCase();
    const isDelete = act.includes('exclu') || act.includes('remov') || det.includes('exclui') || det.includes('remov');

    if (act.includes('vídeo') || act.includes('video')) {
      return {
        Icon: isDelete ? Trash2 : VideoIcon,
        label: isDelete ? 'Vídeo excluído' : 'Vídeo atualizado',
        chip: isDelete ? CHIP.rose : CHIP.emerald,
      };
    }
    if (act.includes('storie') || act.includes('coleção')) {
      return {
        Icon: isDelete ? Trash2 : Plus,
        label: isDelete ? 'Coleção de stories excluída' : 'Coleção de stories criada',
        chip: isDelete ? CHIP.rose : CHIP.violet,
      };
    }
    if (act.includes('aparência') || act.includes('design')) {
      return { Icon: Palette, label: 'Aparência personalizada', chip: CHIP.cyan };
    }
    if (act.includes('config')) {
      return { Icon: Settings, label: 'Configurações salvas', chip: CHIP.amber };
    }
    if (act.includes('script') || act.includes('embed')) {
      return { Icon: Code2, label: 'Instalação do script', chip: CHIP.blue };
    }
    if (isDelete) {
      return { Icon: Trash2, label: 'Item removido', chip: CHIP.rose };
    }
    return { Icon: Activity, label: action || 'Atividade realizada', chip: CHIP.slate };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#0091ff] dark:border-[#ff7a29] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500 dark:text-[#c0c5d4]">Carregando visão geral...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-900 dark:text-[#e8ecf4] min-h-screen -m-6 p-6 sm:p-8 bg-transparent dark:bg-[radial-gradient(ellipse_at_top,_#1a1f3a_0%,_#0f1220_55%,_#0a0e1a_100%)]">

      {/* ── 1. HEADER (Boas Vindas sem subtítulo longo + Card Status do App) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-orange-500/15 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="lg:col-span-2 flex flex-col justify-center space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-[#0091ff] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-3 py-1 rounded-full border border-blue-100 dark:border-[#ff7a29]/25 dark:shadow-[0_0_12px_rgba(255,122,41,0.2)]">
              Plano {usage.planName}
            </span>
            {usage.subscriptionStatus === 'trialing' && usage.trialDaysLeft !== null ? (
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700/40">
                Período de Testes ({usage.trialDaysLeft} dias restantes)
              </span>
            ) : usage.subscriptionStatus === 'active' ? (
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/40">
                Assinatura Ativa
              </span>
            ) : null}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Olá, {storeName || 'seja bem-vindo(a)'}
            </h1>
          </div>
        </div>

        {/* Card de Status do App */}
        <div className="lg:col-span-1 flex items-stretch">
          {appEnabled ? (
            <div className="w-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] border-2 border-emerald-500/25 rounded-[1.8rem] p-5 flex flex-col justify-center space-y-2.5 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.06)] dark:shadow-[0_4px_25px_rgba(16,185,129,0.02)]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Aplicativo Ativado
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                Seus vídeos estão online e sendo transmitidos publicamente no seu e-commerce.
              </p>
            </div>
          ) : (
            <div className="w-full bg-rose-500/[0.04] dark:bg-rose-500/[0.02] border-2 border-rose-500/25 rounded-[1.8rem] p-5 flex flex-col justify-center space-y-2.5 transition-all shadow-[0_4px_20px_rgba(244,63,94,0.06)] dark:shadow-[0_4px_25px_rgba(244,63,94,0.02)]">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-rose-500"></span>
                <span className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                  Aplicativo Desativado
                </span>
              </div>
              <p className="text-xs font-semibold text-rose-700/80 dark:text-rose-400/80 leading-relaxed">
                Seus stories estão pausados e temporariamente ocultos para o público no seu site.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. CARDS DE FATURAMENTO (INDICAÇÕES & VENDAS DOS VÍDEOS) ── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-3 px-1">
          Resultados Financeiros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Faturamento com Indicações */}
          <div
            onClick={() => navigate('/indica-e-ganha')}
            className="cursor-pointer bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 rounded-[1.8rem] border border-slate-200 dark:border-orange-500/15 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">
                  Faturamento com Indicações
                </span>
                <span className="text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  Comissões
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(referralEarnings)}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] group-hover:text-[#0091ff] dark:group-hover:text-[#ff7a29] transition-colors flex items-center gap-1">
                Ver detalhes no Indica & Ganha &rarr;
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0">
              <DollarSign size={26} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Card Faturamento de Vendas dos Vídeos */}
          <div
            onClick={() => navigate('/videos/performance')}
            className="cursor-pointer bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 rounded-[1.8rem] border border-slate-200 dark:border-orange-500/15 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">
                  Vendas Vindas dos Vídeos
                </span>
                <span className="text-[10px] font-black uppercase bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29] px-2 py-0.5 rounded-full border border-blue-200 dark:border-orange-500/30">
                  Conversões
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(videoRevenue)}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] group-hover:text-[#0091ff] dark:group-hover:text-[#ff7a29] transition-colors flex items-center gap-1">
                Acompanhar métricas de performance &rarr;
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29] shrink-0">
              <TrendingUp size={26} className="stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. CONSUMO DO PLANO ── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-3 px-1">
          Consumo do Plano
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Views */}
          <div className="bg-white dark:bg-[#1a1f35]/70 dark:backdrop-blur-md p-5 rounded-[1.8rem] border border-slate-200 dark:border-orange-500/15 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">Visualizações</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29]">
                <Eye size={16} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {usage.viewsUsed.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">de {usage.viewsLimit.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-[#111524] rounded-full overflow-hidden p-0.5 border border-transparent dark:border-white/5">
              <div className={`h-full ${getBarColor(viewsPercent)} rounded-full transition-all duration-500`} style={{ width: `${viewsPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-[#c0c5d4]">
              <span>Quota do mês</span>
              <span className={viewsPercent >= 90 ? 'text-rose-500 font-black' : 'text-[#0091ff] dark:text-[#ff7a29]'}>{viewsPercent}%</span>
            </div>
          </div>

          {/* Card Armazenamento */}
          <div className="bg-white dark:bg-[#1a1f35]/70 dark:backdrop-blur-md p-5 rounded-[1.8rem] border border-slate-200 dark:border-orange-500/15 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">Armazenamento</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29]">
                <HardDrive size={16} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {usage.storageUsedMB >= 1024 ? `${(usage.storageUsedMB / 1024).toFixed(1)} GB` : `${usage.storageUsedMB} MB`}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">de {(usage.storageLimitMB / 1024).toFixed(0)} GB</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-[#111524] rounded-full overflow-hidden p-0.5 border border-transparent dark:border-white/5">
              <div className={`h-full ${getBarColor(storagePercent)} rounded-full transition-all duration-500`} style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-[#c0c5d4]">
              <span>Vídeos na nuvem</span>
              <span className={storagePercent >= 90 ? 'text-rose-500 font-black' : 'text-[#0091ff] dark:text-[#ff7a29]'}>{storagePercent}%</span>
            </div>
          </div>

          {/* Card Páginas */}
          <div className="bg-white dark:bg-[#1a1f35]/70 dark:backdrop-blur-md p-5 rounded-[1.8rem] border border-slate-200 dark:border-orange-500/15 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">Páginas com Vídeos</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29]">
                <FileText size={16} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white">{usage.pagesUsed}</span>
              <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">de {usage.pagesLimit} ativas</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-[#111524] rounded-full overflow-hidden p-0.5 border border-transparent dark:border-white/5">
              <div className={`h-full ${getBarColor(pagesPercent)} rounded-full transition-all duration-500`} style={{ width: `${pagesPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-[#c0c5d4]">
              <span>Locais de exibição</span>
              <span className={pagesPercent >= 90 ? 'text-rose-500 font-black' : 'text-[#0091ff] dark:text-[#ff7a29]'}>{pagesPercent}%</span>
            </div>
          </div>

          {/* Card Ciclo da Conta */}
          <div className="bg-white dark:bg-[#1a1f35]/70 dark:backdrop-blur-md p-5 rounded-[1.8rem] border border-slate-200 dark:border-orange-500/15 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">Ciclo da Conta</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29]">
                <Clock size={16} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-[#8a90a0] uppercase tracking-widest">Status</p>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {usage.subscriptionStatus === 'active' ? 'Assinatura Ativa' : `${usage.trialDaysLeft} dias restantes`}
              </p>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-[#c0c5d4] border-t border-slate-100 dark:border-white/5 pt-2">
              <span>Renovação:</span>
              <span>{usage.currentPeriodEnd ? new Date(usage.currentPeriodEnd).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. CARD DE DIVULGAÇÃO DE OUTROS PRODUTOS E SERVIÇOS ── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-lg border border-blue-400/30">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black uppercase tracking-wider text-white border border-white/20">
              <Sparkles size={14} className="text-amber-300" />
              Ecossistema Loja Lucrativa
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Turbine sua operação com nossas soluções e serviços parceiros
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Descubra ferramentas especializadas para checkout de alta conversão, automações de vendas, temas exclusivos e consultoria estratégica para escalar o seu e-commerce.
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              href="https://sistemalojalucrativa.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md hover:scale-105"
            >
              Conhecer Soluções
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Efeito sutil de brilho no fundo */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── 5. CHECKLIST REORGANIZADO + LOG DE ATIVIDADES RECENTES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Checklist */}
        <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-5 mb-5">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white">
                  Checklist da Ativação da Loja
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-[#c0c5d4] mt-0.5">
                  Conclua os passos para publicar seus stories.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-24 h-2.5 bg-slate-100 dark:bg-[#111524] rounded-full overflow-hidden p-0.5 border border-transparent dark:border-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      checklistPercent === 100
                        ? "!bg-[#22c55e]"
                        : "!bg-[#0091ff] dark:!bg-[#ff7a29]"
                    )}
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-black",
                  checklistPercent === 100
                    ? "text-[#22c55e]"
                    : "text-[#0091ff] dark:text-[#ff7a29]"
                )}>
                  {checklistPercent}%
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              {checklist.map((item, index) => {
                const pct = item.percent ?? (item.completed ? 100 : 0);
                const isPartial = !item.completed && pct > 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className={cn(
                      'flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer group',
                      item.completed
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/30'
                        : isPartial
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/70 dark:border-amber-700/40 hover:shadow-md'
                        : 'bg-slate-50/70 dark:bg-[#111524]/60 border-slate-200 dark:border-white/5 hover:bg-white dark:hover:bg-[#1a1f35] hover:border-[#0091ff] dark:hover:border-[#ff7a29] hover:shadow-md'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-sm transition-all',
                        item.completed
                          ? 'bg-emerald-500 text-white shadow-sm font-black'
                          : isPartial
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'border-2 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-[#0091ff] dark:group-hover:border-[#ff7a29]'
                      )}
                    >
                      {item.completed ? '✓' : isPartial ? <AlertTriangle size={14} className="stroke-[2.5]" /> : index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={cn(
                            'text-xs font-black flex items-center gap-1.5',
                            item.completed
                              ? 'text-emerald-950 dark:text-emerald-300 line-through opacity-80'
                              : isPartial
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-slate-900 dark:text-white group-hover:text-[#0091ff] dark:group-hover:text-[#ff7a29]'
                          )}
                        >
                          {item.title}
                          {isPartial && (
                            <span className="text-[10px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                              {pct}%
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] font-bold text-[#0091ff] dark:text-[#ff7a29] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Configurar &rarr;
                        </span>
                      </div>
                      <p className={cn(
                        "text-[11px] mt-0.5 font-medium leading-relaxed truncate",
                        isPartial ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-[#8a90a0]"
                      )}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-white/5 pb-5 mb-5">
              <h2 className="text-base font-black text-slate-800 dark:text-white">
                Atividade Recente (Log do Painel)
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-[#c0c5d4] mt-0.5">
                Histórico em tempo real de alterações e atividades do usuário.
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-[#8a90a0] text-xs font-semibold">
                Nenhuma atividade administrativa registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[360px] overflow-y-auto pr-1">
                {activities.map((ev) => {
                  const meta = getActivityMeta(ev.action, ev.details || '');
                  const MetaIcon = meta.Icon;

                  return (
                    <div key={ev.id} className="py-3.5 flex items-start justify-between gap-3 text-xs animate-fade-in">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', meta.chip)}>
                          <MetaIcon size={14} className="stroke-[2.5]" />
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 dark:text-[#e8ecf4] block leading-snug">
                            {meta.label}
                            {ev.details && <span className="text-slate-900 dark:text-white">: {ev.details}</span>}
                          </span>
                          <p className="text-[10px] text-slate-400 dark:text-[#8a90a0] mt-0.5 font-medium">
                            {new Date(ev.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. ACADEMY & INDIQUE E GANHE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Academy */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1a1f35]/75 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 p-6 sm:p-7 rounded-2xl shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_30px_rgba(255,122,41,0.1)] transition-all duration-300 flex flex-col md:flex-row items-center gap-5">
          <div className="w-full md:w-44 h-28 bg-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden flex-shrink-0 group cursor-pointer border border-slate-800 dark:border-white/10">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop"
              alt="Thumbnail do Tutorial"
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-[#0091ff] dark:bg-[#ff7a29] text-white flex items-center justify-center shadow-lg dark:shadow-[0_0_16px_rgba(255,122,41,0.6)] group-hover:scale-110 transition-transform">
                <Play size={17} fill="white" className="ml-0.5" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5 text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0091ff] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-[#ff7a29]/25 inline-block">
              🎓 Vidlytics Academy
            </span>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">
              Como dobrar suas conversões com vídeos em 3 passos
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#c0c5d4] font-medium leading-relaxed">
              Aprenda as melhores práticas de posicionamento e gatilhos de CTA para aumentar as vendas da sua loja.
            </p>
          </div>
        </div>

        {/* Indique e Ganhe */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1a1f35]/90 dark:backdrop-blur-md p-6 sm:p-7 rounded-2xl shadow-sm hover:shadow-md dark:hover:shadow-[0_8px_20px_rgba(255,122,41,0.15)] flex flex-col justify-between border border-slate-200 dark:border-orange-500/15 hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#0091ff] dark:bg-[#ff7a29] text-white shadow-sm shadow-blue-500/30 dark:shadow-orange-500/30">
                  <DollarSign size={18} className="!text-white stroke-[2.5]" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Indique e Ganhe
                </h4>
              </div>
              <Share2 size={16} className="text-slate-400 dark:text-slate-400" />
            </div>

            <div className="border-b border-blue-500/20 dark:border-orange-500/20 my-3.5" />

            <p className="text-xs text-slate-500 dark:text-[#c0c5d4] font-medium leading-relaxed">
              Receba comissões e desbloqueie meses gratuitos ao indicar o Vidlytics para outros lojistas.
            </p>
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={handleCopyReferral}
              className="w-full bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 dark:shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedReferral ? (
                <>
                  <Check size={14} className="!text-white shrink-0 stroke-[3]" />
                  <span className="!text-white font-black">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} className="!text-white shrink-0" />
                  <span className="!text-white font-black">Copiar Meu Link de Indicação</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/indica-e-ganha')}
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-[#0091ff] dark:text-[#8a90a0] dark:hover:text-[#ff7a29] transition-colors py-1 cursor-pointer flex items-center justify-center gap-1 group"
            >
              <span>Acessar painel de indicações</span>
              <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
