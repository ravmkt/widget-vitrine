import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import FloatingSupportButton from './FloatingSupportButton';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Sparkles, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);

  // Busca status de assinatura para controle do banner global
  useEffect(() => {
    const checkStoreSubscription = async () => {
      try {
        if (!supabase) return;

        let activeStoreId =
          localStorage.getItem('vidlytics_current_store_id') ||
          localStorage.getItem('current_store_id') ||
          localStorage.getItem('store_id');

        if (!activeStoreId) {
          const { data: storeData } = await supabase
            .from('stores')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (storeData) {
            activeStoreId = storeData.id;
          }
        }

        if (!activeStoreId) return;

        const { data: store } = await supabase
          .from('stores')
          .select('subscription_status, trial_ends_at')
          .eq('id', activeStoreId)
          .maybeSingle();

        if (store) {
          setSubscriptionStatus(store.subscription_status || 'trialing');

          if (store.subscription_status === 'trialing' && store.trial_ends_at) {
            const endsAt = new Date(store.trial_ends_at).getTime();
            const now = new Date().getTime();
            const diffDays = Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24));
            setTrialDaysRemaining(Math.max(0, diffDays));
          }
        }
      } catch (e) {
        console.warn('[AppLayout] Falha ao verificar status da loja:', e);
      }
    };

    checkStoreSubscription();
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
          <main className="flex-1 p-4 md:p-8 animate-fade-in relative z-0">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
            <FloatingSupportButton />
          </main>
        </SidebarInset>
      </div>
      <Toaster position="top-center" richColors duration={3000} />
    </SidebarProvider>
  );
}
