import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Props {
  children: React.ReactNode;
}

export const MasterAdminRoute = ({ children }: Props) => {
  const { user, isSuperAdmin: authIsSuperAdmin, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function verifyAccess() {
      if (authLoading) return;

      if (!user) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      // Se o AuthContext já confirmou que é super admin
      if (authIsSuperAdmin) {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Checagem direta de segurança no banco de dados
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('user_id', user.id)
          .single();

        if (profile?.is_super_admin) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (err) {
        console.error('Erro ao checar permissão Master Admin:', err);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    }

    verifyAccess();
  }, [user, authIsSuperAdmin, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
