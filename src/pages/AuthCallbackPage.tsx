import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ensureUserTenantAtomics } from '@/lib/auth';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let authProcessed = false;

    const processUser = async (user: any) => {
      if (authProcessed || !user) return;
      authProcessed = true;
      console.log('[Auth Callback] Usuário autenticado detectado:', user.id, user.email);

      try {
        const tenantResult = await ensureUserTenantAtomics(user);
        console.log('[Auth Callback] Tenant provisionado com sucesso:', tenantResult);
        if (isMounted) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Callback] Erro ao provisionar tenant:', err);
        if (isMounted) {
          setError(err.message || 'Falha ao provisionar acesso à sua loja.');
          setTimeout(() => navigate('/login', { replace: true }), 4000);
        }
      }
    };

    if (!supabase) {
      setError('Configuração do Supabase não encontrada.');
      return;
    }

    // 1. Processamento explícito do código de autorização PKCE (?code=...)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    const handleCallbackFlow = async () => {
      try {
        if (code) {
          console.log('[Auth Callback] Processando troca de código PKCE...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data?.session?.user) {
            return processUser(data.session.user);
          }
        }

        // 2. Se não houver code na query ou se já foi processado, obtém a sessão ativa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user) {
          return processUser(session.user);
        }

        // 3. Fallback adicional via getUser
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          return processUser(user);
        }
      } catch (err: any) {
        console.error('[Auth Callback] Erro no fluxo de sessão:', err);
        if (isMounted && !authProcessed) {
          setError(err.message || 'Não foi possível validar a sessão do Google.');
          setTimeout(() => navigate('/login', { replace: true }), 4000);
        }
      }
    };

    // Escuta eventos de login caso a resolução assíncrona dispare após o mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth Callback] onAuthStateChange event:', event, 'tem session:', !!session);
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
        processUser(session.user);
      }
    });

    handleCallbackFlow();

    // Timeout de segurança para evitar carregamento infinito (10 segundos)
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !authProcessed) {
        console.warn('[Auth Callback] Timeout de 10s atingido sem resolução de sessão.');
        setError('Tempo limite excedido ao validar o login. Redirecionando...');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    }, 10000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7FAFC] p-4 text-center">
      {error ? (
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200">
          <div className="text-rose-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro na Autenticação</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <p className="text-xs text-slate-400">Redirecionando para a tela de login...</p>
        </div>
      ) : (
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200 flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-[#0094EB] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Conectando sua conta...</h2>
          <p className="text-xs text-slate-500 mt-1">Configurando sua loja e permissões de acesso.</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallbackPage;
