import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Props {
  children: React.ReactNode;
}

export const MasterAdminRoute = ({ children }: Props) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkMasterAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('user_id', session.user.id)
          .maybeSingle();

        setHasAccess(!!profile?.is_super_admin);
      } catch (err) {
        console.error('Erro ao verificar acesso Master:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkMasterAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Se não estiver logado ou não for Super Admin, manda direto para a tela de login do Master
  if (!hasAccess) {
    return <Navigate to="/master/login" replace />;
  }

  return <>{children}</>;
};
