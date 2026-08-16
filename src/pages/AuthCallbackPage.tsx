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
      try {
        await ensureUserTenantAtomics(user);
        if (isMounted) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Callback] Erro ao processar tenant:', err);
        if (isMounted) {
          setError(err.message || 'Falha ao provisionar acesso à sua loja.');
          setTimeout(() => navigate('/login', { replace: true }), 3500);
        }
      }
    };

    if (!supabase) {
      setError('Configuração do Supabase não encontrada.');
      return;
    }

    // 1. Escuta mudanças de estado de autenticação (OAuth PKCE / Hash parsing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') && session?.user) {
        processUser(session.user);
      }
    });

    // 2. Checagem de segurança inicial caso a sessão já esteja ativa
    supabase.auth.getSession().then(({ data: { session }, error: sessionErr }) => {
      if (sessionErr) {
        console.warn('[Auth Callback] Erro ao recuperar sessão:', sessionErr);
        return;
      }
      if (session?.user) {
        processUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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
