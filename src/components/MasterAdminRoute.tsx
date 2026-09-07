import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Props {
  children: React.ReactNode;
}

export const MasterAdminRoute = ({ children }: Props) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function checkMasterAccess() {
      try {
        // Pega a sessão diretamente do storage local sem risco de dessincronização
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Verifica na tabela profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.is_super_admin) {
          setIsSuperAdmin(true);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (err) {
        console.error('Erro na checagem Master Admin:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkMasterAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
