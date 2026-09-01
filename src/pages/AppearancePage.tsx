import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Monitor, Save, RotateCcw, 
  Play, Sparkles, LayoutGrid, Sliders, 
  Eye, Palette, Video, Settings, RefreshCw,
  Maximize2, Check, ArrowRight, Volume2, VolumeX,
  ChevronLeft, ChevronRight, X, Flame
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// Interface tipada que dita toda a aparência customizável do Widget Vidlytics
export interface AppearanceConfig {
  id?: string;
  tenant_id?: string;
  // Configurações Gerais
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  borderRadius: number;
  
  // Balão Flutuante (Trigger)
  bubbleSize: number;
  bubblePosition: 'bottom-right' | 'bottom-left';
  bubbleText: string;
  bubbleTextColor: string;
  bubbleBgColor: string;
  bubbleAnimation: 'pulse' | 'bounce' | 'none';
  showBubbleText: boolean;
  bubbleBorderColor: string;
  
  // Carrossel & Grade de Exibição
  carouselLayout: 'circle' | 'square' | 'rectangle';
  carouselSize: number;
  carouselSpacing: number;
  showTitle: boolean;
  titleFontSize: number;
  titleColor: string;
  borderColorActive: string;
  
  // Player de Vídeo dos Stories
  autoplay: boolean;
  soundOnHover: boolean;
  showProgressBar: boolean;
  loop: boolean;
  ctaColor: string;
  ctaTextColor: string;
  ctaBorderRadius: number;
  showShareButton: boolean;
  
  // Custom CSS avançado
  customCss?: string;
}

// Configuração padrão de fallback (Segurança em primeiro lugar)
const DEFAULT_CONFIG: AppearanceConfig = {
  primaryColor: '#e11d48', // rose-600
  textColor: '#1f2937',    // gray-800
  backgroundColor: '#ffffff',
  borderRadius: 12,
  
  bubbleSize: 76,
  bubblePosition: 'bottom-right',
  bubbleText: 'Assista agora! 🔥',
  bubbleTextColor: '#ffffff',
  bubbleBgColor: '#e11d48',
  bubbleAnimation: 'pulse',
  showBubbleText: true,
  bubbleBorderColor: '#ffffff',
  
  carouselLayout: 'circle',
  carouselSize: 84,
  carouselSpacing: 14,
  showTitle: true,
  titleFontSize: 12,
  titleColor: '#374151',
  borderColorActive: '#e11d48',
  
  autoplay: true,
  soundOnHover: false,
  showProgressBar: true,
  loop: true,
  ctaColor: '#e11d48',
  ctaTextColor: '#ffffff',
  ctaBorderRadius: 8,
  showShareButton: true,
  customCss: ''
};

// Mock de stories do Vidlytics para alimentar a simulação em tempo real
interface MockStory {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  ctaText?: string;
  ctaLink?: string;
}

const MOCK_STORIES: MockStory[] = [
  {
    id: '1',
    title: 'Nova Coleção',
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-with-silver-glitter-makeup-40114-large.mp4',
    ctaText: 'Ver Coleção',
    ctaLink: '#colecao'
  },
  {
    id: '2',
    title: 'Review Cliente',
    thumbnail: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=300&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lighting-40097-large.mp4',
    ctaText: 'Garantir Cupom',
    ctaLink: '#cupom'
  },
  {
    id: '3',
    title: 'Mais Vendidos',
    thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-beautiful-woman-smiling-at-camera-in-nature-40432-large.mp4',
    ctaText: 'Comprar Agora',
    ctaLink: '#mais-vendidos'
  },
  {
    id: '4',
    title: 'Dicas de Uso',
    thumbnail: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-glasses-smiling-40105-large.mp4',
    ctaText: 'Ver Dicas',
    ctaLink: '#dicas'
  }
];

export function AppearancePage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppearanceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeStory, setActiveStory] = useState<MockStory | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  // Busca as configurações customizadas do tenant/loja atual no Supabase
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Recupera o tenant associado ao usuário atual
        const { data: tenantMember } = await supabase
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (tenantMember) {
          const { data: widgetConfig, error } = await supabase
            .from('widget_configs')
            .select('*')
            .eq('tenant_id', tenantMember.tenant_id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') throw error;

          if (widgetConfig) {
            // Unifica os dados da nuvem com as chaves padrão caso existam novas propriedades na aplicação
            setConfig({
              ...DEFAULT_CONFIG,
              ...widgetConfig,
              id: widgetConfig.id,
              tenant_id: widgetConfig.tenant_id
            });
          } else {
            // Se não houver configurações, vincula o tenant_id para criação
            setConfig(prev => ({ ...prev, tenant_id: tenantMember.tenant_id }));
          }
        }
      } catch (err: any) {
        console.error('Erro ao recuperar configurações de aparência:', err);
        toast({
          title: 'Erro de Sincronização',
          description: 'Não foi possível carregar as preferências. Exibindo configurações padrão.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [toast]);

  // Handler centralizado para salvar os ajustes em produção de forma segura
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        ...config,
        updated_at: new Date().toISOString()
      };

      let error;
      if (config.id) {
        const { error: updateError } = await supabase
          .from('widget_configs')
          .update(payload)
          .eq('id', config.id);
        error = updateError;
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('widget_configs')
          .insert([payload])
          .select();
        error = insertError;
        if (insertedData && insertedData[0]) {
          setConfig(prev => ({ ...prev, id: insertedData[0].id }));
        }
      }

      if (error) throw error;

      toast({
        title: 'Configurações Salvas! 🚀',
        description: 'As alterações de design e layout do widget já estão ativas em ambiente sandbox e produção.',
      });
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      toast({
        title: 'Falha ao salvar',
        description: 'Houve um erro técnico. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Restaura os padrões estéticos do Vidlytics
  const handleReset = () => {
    if (confirm('Deseja realmente redefinir todos os estilos para o padrão original da plataforma?')) {
      setConfig({
        ...DEFAULT_CONFIG,
        id: config.id,
        tenant_id: config.tenant_id
      });
      toast({
        title: 'Estilos redefinidos',
        description: 'Lembre-se de clicar em salvar para publicar as mudanças padrão.',
      });
    }
  };

  const updateField = <K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-rose-500" />
        <p className="text-gray-500 text-sm">Carregando painel de design Vidlytics...</p>
      </div>
    );
  }
