import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import FloatingSupportButton from './FloatingSupportButton';
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
                const isRed = days <= 1;
                const isOrange = days === 2;
                
                // Mensagens dinâmicas calibradas
                const message = days <= 0
                  ? 'O seu período de teste expira hoje.'
                  : days === 1
                  ? 'O seu período de teste expira amanhã.'
                  : days === 2
                  ? 'Expira em 2 dias.'
                  : `Você está no período de teste gratuito: restam ${days} dias.`;

                // Transição de cores do banner: Azul -> Laranja (2 dias) -> Vermelho (1 dia)
                const bannerBgColor = isRed
                  ? 'bg-[#ef4444]'
                  : isOrange
                  ? 'bg-[#ff7a29]'
                  : 'bg-[#0094EB]';

                return (
                  <div
                    className={cn(
                      "px-4 py-2.5 text-white shadow-md transition-colors duration-300",
                      bannerBgColor
                    )}
                  >
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row text-xs font-semibold">
                      <div className="flex items-center gap-2 text-white">
                        <Clock size={16} className="shrink-0 animate-pulse text-white" />
                        <span className="text-white font-bold">{message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/plans')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <Sparkles size={13} className="text-white" />
                        Fazer Upgrade
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
            <FloatingSupportButton />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}