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
      const userMembers = members.filter((item) => item.user_id === user.id);
      const stores = await db.stores.getAll();
      const membershipStore = userMembers.length > 0
        ? stores.find((store) => store.id === userMembers[0].store_id) || null
        : null;

      setCurrentStore(membershipStore);
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
