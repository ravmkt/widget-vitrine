import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { supabase } from '@/lib/supabase';
import { Sparkles, Clock, AlertTriangle, XCircle, Lock } from 'lucide-react';
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

  // ═══════════════════════════════════════════════
  // 🔒 BLOQUEIO DE SEGURANÇA (HARDENING)
  // ═══════════════════════════════════════════════
  // Bloqueia a conta caso esteja em trialing com 0 dias ou menos restantes
  const isTrialExpired = 
    subscriptionStatus === 'trialing' && 
    trialDaysRemaining !== null && 
    trialDaysRemaining <= 0;

  // Só bloqueia se o usuário NÃO estiver nas páginas de faturamento ou planos
  const isBlocked = 
    isTrialExpired && 
    location.pathname !== '/billing' && 
    location.pathname !== '/plans';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background relative overflow-visible">
        <div className="relative z-40 shrink-0">
          <AppSidebar />
        </div>
        <SidebarInset className="flex flex-col flex-1 relative z-0 min-w-0">
          {/* Banner Global de Trial / Status (exceto na página de billing e plans) */}
          {location.pathname !== '/billing' && location.pathname !== '/plans' && (
            <>
              {subscriptionStatus === 'trialing' && (() => {
                const days = trialDaysRemaining ?? 7;
                
                // Definição estrita das condições baseadas no que foi solicitado:
                const isCritical = days <= 1;             // Vermelho se faltar 1 dia ou menos
                const isWarning = days === 2 || days === 3; // Laranja se faltar 2 ou 3 dias
                const isNormal = days > 3;                 // Cinza se for maior que 3 dias

                // Cálculo preciso de horas restantes para quando faltar 1 dia ou menos
                let hoursRemaining = 24;
                if (trialEndsAt) {
                  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
                  hoursRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
                }

                // 1. Mensagem Dinâmica com Contagem
                const message = isCritical
                  ? hoursRemaining <= 1
                    ? 'O seu período de teste expira em menos de 1 hora.'
                    : `O seu período de teste expira em ${hoursRemaining} horas.`
                  : isWarning
                  ? `Seu período de teste expira em ${days} dias. Faça o upgrade para não perder o acesso!`
                  : `Você está no período de teste gratuito: restam ${days} dias.`;

                // 2. Estilo da Barra Blindada contra o Dark Mode
                const bannerStyle = isCritical
                  ? '!bg-[#ef4444] shadow-md border-transparent text-white animate-pulse' // Crítico: Vermelho Vivo
                  : isWarning
                  ? '!bg-[#f97316] border-b border-orange-600 shadow-sm text-white'       // Atenção: Laranja Vibrante
                  : '!bg-slate-100 dark:!bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'; // Normal: Cinza Claro

                // 3. Estilo do Botão "Fazer Upgrade" (Forçado e Imutável)
                const buttonStyle = isCritical
                  ? '!bg-white hover:!bg-slate-100 !text-[#ef4444] border !border-white' // Botão Branco com texto Vermelho
                  : isWarning
                  ? '!bg-slate-900 hover:!bg-black !text-white border !border-slate-900'   // Botão Escuro
                  : '!bg-[#22c55e] hover:!bg-[#16a34a] !text-white border !border-emerald-600'; // Botão Verde vibrante

                // 4. Cor do Texto e Ícone Forçados
                const textAndIconClass = (isCritical || isWarning) ? '!text-white' : '!text-slate-900 dark:!text-slate-100';

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
                <div className="bg-red-600 px-4 py-2.5 text-white shadow-sm animate-fade-in">
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
                <div className="bg-amber-500 px-4 py-2.5 text-white shadow-sm animate-fade-in">
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

          <main className="flex-1 p-4 md:p-8 animate-fade-in relative z-0 flex flex-col justify-between">
            <div className="mx-auto w-full max-w-7xl flex-1">
              {isBlocked ? (
                /* ── TELA DE BLOQUEIO DO SISTEMA (HARDENING) ── */
                <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50 dark:bg-[#111422] rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 min-h-[50vh] shadow-xs">
                  <div className="h-16 w-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-6 border border-red-200 dark:border-red-900/30 shadow-md">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Sua conta está pausada
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-[#c0c5d4] max-w-md mt-3 leading-relaxed">
                    Seu período de teste gratuito de 7 dias chegou ao fim. Para continuar usando o <strong>Vidlytics Stories</strong> e exibir os vídeos no seu site, escolha um dos nossos planos.
                  </p>
                  
                  <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                      type="button"
                      onClick={() => navigate('/plans')}
                      className="inline-flex items-center gap-2.5 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <Sparkles size={16} />
                      Escolher Plano & Reativar Conta
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/billing')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Acessar Faturas
                    </button>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>

            {/* ── RODAPÉ DE CRÉDITOS DO SISTEMA LOJA LUCRATIVA ── */}
            <footer className="mt-16 pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <div>
                &copy; {new Date().getFullYear()} Vidlytics Stories. Todos os direitos reservados.
              </div>
              
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#111422] px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 shadow-xs">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-[#8a90a0]">
                  Desenvolvido por:
                </span>
                <a 
                  href="https://sistemalojalucrativa.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="transition-opacity hover:opacity-80 flex items-center"
                >
                  <img 
                    src="/assets/sll-logotipo.png" 
                    alt="Sistema Loja Lucrativa" 
                    className="w-[120px] h-auto object-contain brightness-100 dark:brightness-110" 
                  />
                </a>
              </div>
            </footer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
