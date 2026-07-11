import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, Store } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

type TenantContextValue = {
  currentStore: Store | null;
  storeId: string | null;
  loading: boolean;
};

const TenantContext = createContext<TenantContextValue>({
  currentStore: null,
  storeId: null,
  loading: true,
});

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setCurrentStore(null);
        setLoading(false);
        return;
      }

      const members = await db.storeMembers.getAll();
      const userMembers = members
        .filter((item) => item.user_id === user.id)
        .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

      const member = userMembers[0];
      if (!member) {
        setCurrentStore(null);
        setLoading(false);
        return;
      }

      const stores = await db.stores.getAll();
      // Multi-store selector UI will come later; for now we use the oldest membership deterministically.
      setCurrentStore(stores.find((store) => store.id === member.store_id) || null);
      setLoading(false);
    };
    load();
  }, [user]);

  const value = useMemo(() => ({
    currentStore,
    storeId: currentStore?.id || null,
    loading,
  }), [currentStore, loading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
