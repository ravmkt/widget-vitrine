import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface AuthContextType {
  user: any;
  isSuperAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshSuperAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isSuperAdmin: false,
  loading: true,
  logout: async () => {},
  refreshSuperAdmin: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSuperAdminStatus = async (userId?: string) => {
    if (!supabase || !userId) {
      setIsSuperAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data?.is_super_admin) {
        setIsSuperAdmin(true);
      } else {
        setIsSuperAdmin(false);
      }
    } catch {
      setIsSuperAdmin(false);
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AuthContext] Erro no signOut:', err);
    } finally {
      try {
        const theme = localStorage.getItem('app-theme');
        localStorage.clear();
        sessionStorage.clear();
        if (theme) localStorage.setItem('app-theme', theme);
      } catch (_) {}
      setUser(null);
      setIsSuperAdmin(false);
      window.location.href = '/login';
    }
  };

  const refreshSuperAdmin = async () => {
    if (user?.id) {
      await checkSuperAdminStatus(user.id);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser?.id) {
        await checkSuperAdminStatus(currentUser.id);
      }
      setLoading(false);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u?.id) {
        await checkSuperAdminStatus(u.id);
      } else {
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isSuperAdmin,
      loading,
      logout,
      refreshSuperAdmin,
    }),
    [user, isSuperAdmin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
