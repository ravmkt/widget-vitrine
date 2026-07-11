import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, Store } from '@/lib/db';

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
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stores = await db.stores.getAll();
      setCurrentStore(stores[0] || null);
      setLoading(false);
    };
    load();
  }, []);

  const value = useMemo(() => ({
    currentStore,
    storeId: currentStore?.id || null,
    loading,
  }), [currentStore, loading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
