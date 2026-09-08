export interface PlanDefinition {
  id?: string;
  name: string;
  slug: 'starter' | 'pro' | 'scale';
  priceMonthly: number;
  priceYearly: number; // valor total anual com 20% off
  priceYearlyPerMonth: number;
  videosLimit: number;
  viewsLimit: number;
  pagesLimit: number;
  storageLimitBytes: number;
  allowsLive: boolean;
  isPopular?: boolean;
  description: string;
  features: string[];
}

export const PLANS: Record<string, PlanDefinition> = {
  starter: {
    name: 'Starter',
    slug: 'starter',
    priceMonthly: 67,
    priceYearly: 643.20,
    priceYearlyPerMonth: 53.60,
    videosLimit: 10,
    viewsLimit: 5000,
    pagesLimit: 2,
    storageLimitBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    allowsLive: false,
    description: 'Perfeito para lojas iniciando com vídeos e stories para aumentar conversão.',
    features: [
      'Até 5.000 visualizações/mês',
      'Até 10 vídeos ativos',
      'Até 2 páginas instaladas',
      '5 GB de armazenamento',
      'Widget Stories e Flutuante',
      'Suporte via e-mail',
    ],
  },
  pro: {
    name: 'Pro',
    slug: 'pro',
    priceMonthly: 127,
    priceYearly: 1219.20,
    priceYearlyPerMonth: 101.60,
    videosLimit: 30,
    viewsLimit: 20000,
    pagesLimit: 10,
    storageLimitBytes: 15 * 1024 * 1024 * 1024, // 15 GB
    allowsLive: true,
    isPopular: true,
    description: 'Para lojas em crescimento acelerado que buscam vender com vídeos e Live Commerce.',
    features: [
      'Até 20.000 visualizações/mês',
      'Até 30 vídeos ativos',
      'Até 10 páginas instaladas',
      '15 GB de armazenamento',
      'Módulo Live Commerce incluso',
      'Analytics avançado de conversão',
      'Suporte prioritário',
    ],
  },
  scale: {
    name: 'Scale',
    slug: 'scale',
    priceMonthly: 247,
    priceYearly: 2371.20,
    priceYearlyPerMonth: 197.60,
    videosLimit: 100,
    viewsLimit: 60000,
    pagesLimit: 9999, // Ilimitado
    storageLimitBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    allowsLive: true,
    description: 'Potência máxima e escala sem limites para grandes marcas do e-commerce.',
    features: [
      'Até 60.000 visualizações/mês',
      'Até 100 vídeos ativos',
      'Páginas ilimitadas',
      '50 GB de armazenamento de alta velocidade',
      'Live Commerce completo',
      'Tagging automático de produtos',
      'Gerente de conta e onboarding dedicado',
    ],
  },
} as const;

export const PLAN_LIMITS: Record<string, { views: number; pages: number; storage: number; videos: number; allowsLive: boolean }> = {
  starter: { views: 5000, pages: 2, storage: 5368709120, videos: 10, allowsLive: false },
  pro: { views: 20000, pages: 10, storage: 16106127360, videos: 30, allowsLive: true },
  scale: { views: 60000, pages: 9999, storage: 53687091200, videos: 100, allowsLive: true },
  // Fallbacks para assinaturas antigas
  iniciante: { views: 5000, pages: 2, storage: 5368709120, videos: 10, allowsLive: false },
  avançado: { views: 20000, pages: 10, storage: 16106127360, videos: 30, allowsLive: true },
  avancado: { views: 20000, pages: 10, storage: 16106127360, videos: 30, allowsLive: true },
  enterprise: { views: 60000, pages: 9999, storage: 53687091200, videos: 100, allowsLive: true },
};
