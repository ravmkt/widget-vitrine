import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ensureUserTenantAtomics } from '@/lib/auth';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let timerId: any = null;

    if (!supabase) {
      setError('Configuração do Supabase não encontrada.');
      return;
    }

    const processAuthUser = async (user: any) => {
      if (processingRef.current || !user) return;
      processingRef.current = true;
      if (timerId) clearTimeout(timerId);

      try {
        console.log('[Auth Callback] Autenticando tenant para o usuário:', user.id);
        await ensureUserTenantAtomics(user);
        if (isMounted) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Callback] Erro na procedure de tenant:', err);
        if (isMounted) {
          setError(err.message || 'Falha ao configurar a sua loja.');
          setTimeout(() => navigate('/login', { replace: true }), 3500);
        }
      }
    };

    const handleAuthInit = async () => {
      // 1. Verifica se houve erro retornado diretamente pelo provedor OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const oauthError = urlParams.get('error_description') || urlParams.get('error');
      if (oauthError) {
        setError(oauthError);
        setTimeout(() => navigate('/login', { replace: true }), 3500);
        return;
      }

      const code = urlParams.get('code');

      try {
        // 2. Se houver código PKCE (?code=...), troca explicitamente
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data?.session?.user) {
            await processAuthUser(data.session.user);
            return;
          }
        }

        // 3. Verifica sessão ativa (recuperada via hash ou cookies do storage)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user) {
          await processAuthUser(session.user);
          return;
        }

        // 4. Fallback direto via getUser
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          await processAuthUser(user);
        }
      } catch (err: any) {
        console.error('[Auth Callback] Erro no fluxo inicial de autenticação:', err);
        if (isMounted && !processingRef.current) {
          setError(err.message || 'Erro ao validar autorização com o Google.');
          setTimeout(() => navigate('/login', { replace: true }), 3500);
        }
      }
    };

    // 5. Listener de eventos de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth Callback] onAuthStateChange:', event, 'Sessão ativa:', !!session);
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') && session?.user) {
        processAuthUser(session.user);
      }
    });

    handleAuthInit();

    // Timer de tolerância de 12s para redes lentas
    timerId = setTimeout(() => {
      if (isMounted && !processingRef.current) {
        setError('Tempo limite excedido ao validar o login. Redirecionando...');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    }, 12000);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7FAFC] dark:bg-[#111524] p-4 text-center transition-colors duration-300">
      {error ? (
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1f35] p-8 shadow-xs border border-slate-200 dark:border-[#ff7a29]/30 transition-all duration-300 hover:shadow-md">
          <div className="text-rose-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Erro na Autenticação</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Redirecionando para a tela de login...</p>
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1f35] p-8 shadow-xs border border-slate-200 dark:border-[#ff7a29]/30 flex flex-col items-center transition-all duration-300 hover:shadow-md">
          <div className="w-10 h-10 border-4 border-[#0091ff] dark:border-[#ff7a29] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-black text-slate-800 dark:text-white">Conectando sua conta...</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configurando sua loja e permissões de acesso.</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallbackPage;
