import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
// Import do FloatingSupportButton removido para limpar o app
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { supabase } from '@/lib/supabase';
import { Sparkles, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  // Busca status de assinatura para controle do banner global com reatividade e invalidação
  useEffect(() => {
    const checkStoreSubscription = async () => {
      try {
        if (!supabase) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        let activeStoreId =
          localStorage.getItem('vidlytics_current_store_id') ||
          localStorage.getItem('current_store_id') ||
          localStorage.getItem('store_id');

        if (user) {
          const { data: userStore } = await supabase
            .from('stores')
            .select('id, subscription_status, trial_ends_at')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (userStore) {
            activeStoreId = userStore.id;
            localStorage.setItem('vidlytics_current_store_id', userStore.id);
            setSubscriptionStatus(userStore.subscription_status || 'trialing');
            setTrialEndsAt(userStore.trial_ends_at || null);

            if (userStore.subscription_status === 'trialing' && userStore.trial_ends_at) {
              const endsAt = new Date(userStore.trial_ends_at).getTime();
              const now = new Date().getTime();
              const diffDays = Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diffDays));
            } else {
              setTrialDaysRemaining(null);
            }
            return;
          }
        }

        if (activeStoreId) {
          const { data: store } = await supabase
            .from('stores')
            .select('subscription_status, trial_ends_at')
            .eq('id', activeStoreId)
            .maybeSingle();

          if (store) {
            setSubscriptionStatus(store.subscription_status || 'trialing');
            setTrialEndsAt(store.trial_ends_at || null);

            if (store.subscription_status === 'trialing' && store.trial_ends_at) {
              const endsAt = new Date(store.trial_ends_at).getTime();
              const now = new Date().getTime();
              const diffDays = Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diffDays));
            } else {
              setTrialDaysRemaining(null);
            }
          }
        }
      } catch (e) {
        console.warn('[AppLayout] Falha ao verificar status da loja:', e);
      }
    };

    checkStoreSubscription();

    const handleFocus = () => checkStoreSubscription();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleFocus);
    };
  }, [location.pathname]);

  // ═══════════════════════════════════════════════
  // 🌗 APLICA O TEMA SALVO AO CARREGAR QUALQUER PÁGINA
  // ═══════════════════════════════════════════════
  useEffect(() => {
    try {
      const theme = localStorage.getItem('app-theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    } catch {}
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background relative overflow-visible">
        <div className="relative z-40 shrink-0">
          <AppSidebar />
        </div>
        <SidebarInset className="flex flex-col flex-1 relative z-0 min-w-0">
          {/* Banner Global de Trial / Status (exceto na página de billing e plans para evitar duplicidade visual) */}
          {location.pathname !== '/billing' && location.pathname !== '/plans' && (
            <>
              {subscriptionStatus === 'trialing' && (() => {
                const days = trialDaysRemaining ?? 7;
                const isCritical = days <= 1;
                const isWarning = days === 2;

                // Cálculo preciso de horas restantes para quando faltar 1 dia ou menos
                let hoursRemaining = 24;
                if (trialEndsAt) {
                  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
                  hoursRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
                }

                // 1. Mensagem Dinâmica com Contagem em Horas
                const message = isCritical
                  ? hoursRemaining <= 1
                    ? 'O seu período de teste expira em menos de 1 hora.'
                    : `O seu período de teste expira em ${hoursRemaining} horas.`
                  : isWarning
                  ? 'Expira em 2 dias.'
                  : `Você está no período de teste gratuito: restam ${days} dias.`;

                // 2. Estilo da Barra Blindada contra o Dark Mode
                const bannerStyle = isCritical
                  ? '!bg-[#ef4444] shadow-md border-transparent' // 3. Crítico: Vermelho bem vivo
                  : isWarning
                  ? '!bg-[#fed7aa] border-b border-orange-300 shadow-sm' // 2. Atenção: Laranja suave / Alerta
                  : '!bg-slate-100 border-b border-slate-200 shadow-xs'; // 1. Normal: Cinza claro

                // 3. Estilo do Botão "Fazer Upgrade" (Forçado e Imutável)
                const buttonStyle = isCritical
                  ? '!bg-white hover:!bg-slate-100 !text-[#ef4444] border !border-white' // Botão Branco com texto Vermelho
                  : isWarning
                  ? '!bg-slate-900 hover:!bg-black !text-white border !border-slate-900' // Botão Preto com texto Branco
                  : '!bg-[#22c55e] hover:!bg-[#16a34a] !text-white border !border-emerald-600'; // Botão Verde vibrante com texto Branco

                // 4. Cor do Texto e Ícone Forçados
                const textAndIconClass = isCritical ? '!text-white' : '!text-slate-900';

                return (
                  <div
                    className={cn(
                      'px-4 py-2.5 sm:py-3 transition-colors duration-300',
                      bannerStyle
                    )}
                  >
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2.5 sm:flex-row text-sm font-semibold">
                      <div className="flex items-center gap-2.5">
                        <Clock
                          size={18}
                          className={cn(
                            'shrink-0',
                            textAndIconClass,
                            isCritical && 'animate-pulse'
                          )}
                        />
                        <span className={cn('text-sm font-bold tracking-tight', textAndIconClass)}>
                          {message}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/plans')}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-sm transition-all hover:scale-[1.02] cursor-pointer shrink-0',
                          buttonStyle
                        )}
                      >
                        <Sparkles
                          size={14}
                          className={isCritical ? '!text-[#ef4444]' : '!text-white'}
                        />
                        <span className={isCritical ? '!text-[#ef4444]' : '!text-white'}>
                          Fazer Upgrade
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
                                                                      
              {subscriptionStatus === 'canceled' && (
                <div className="bg-red-600 px-4 py-2.5 text-white shadow-sm">
                  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="shrink-0 text-red-100" />
                      <span>Sua assinatura está cancelada e os widgets estão pausados na sua loja.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/plans')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50"
                    >
                      <Sparkles size={13} />
                      Reativar Assinatura
                    </button>
                  </div>
                </div>
              )}

              {subscriptionStatus === 'past_due' && (
                <div className="bg-amber-500 px-4 py-2.5 text-white shadow-sm">
                  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0 text-amber-100" />
                      <span>Identificamos uma fatura pendente. Regularize o pagamento para evitar o bloqueio dos vídeos.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/billing')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-bold text-amber-700 shadow-sm transition hover:bg-amber-50"
                    >
                      Ver Faturas
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <main className="flex-1 p-4 md:p-8 animate-fade-in relative z-0">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
            {/* O botão flutuante de suporte foi completamente removido daqui */}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
