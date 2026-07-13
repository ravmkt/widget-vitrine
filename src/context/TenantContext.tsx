import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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

const SELECTED_STORE_KEY = 'vidlytics_selected_store_id';

const getId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const id = String(value).trim();
  return id.length > 0 ? id : null;
};

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTenant = async () => {
      setLoading(true);

      try {
        if (!user?.id) {
          if (!isMounted) return;

          setCurrentStore(null);
          setLoading(false);
          return;
        }

        const userId = String(user.id);

        const [members, stores] = await Promise.all([
          db.storeMembers.getAll(),
          db.stores.getAll(),
        ]);

        if (!isMounted) return;

        if (!stores || stores.length === 0) {
          setCurrentStore(null);
          setLoading(false);
          return;
        }

        const savedStoreId = getId(localStorage.getItem(SELECTED_STORE_KEY));

        const userMembers = members.filter((member) => {
          const memberUserId = getId(member.user_id);
          return memberUserId === userId;
        });

        const memberStoreIds = userMembers
          .map((member) => getId(member.store_id))
          .filter(Boolean) as string[];

        const savedStore =
          savedStoreId && memberStoreIds.includes(savedStoreId)
            ? stores.find((store) => getId(store.id) === savedStoreId) || null
            : null;

        const membershipStore =
          memberStoreIds.length > 0
            ? stores.find((store) => getId(store.id) === memberStoreIds[0]) ||
              null
            : null;

        const ownedStore =
          stores.find((store) => {
            const storeAny = store as unknown as {
              user_id?: unknown;
              owner_id?: unknown;
              ownerId?: unknown;
              userId?: unknown;
            };

            return (
              getId(storeAny.user_id) === userId ||
              getId(storeAny.owner_id) === userId ||
              getId(storeAny.ownerId) === userId ||
              getId(storeAny.userId) === userId
            );
          }) || null;

        /**
         * Fallback importante:
         * Em alguns ambientes locais a loja existe, mas o vínculo em
         * storeMembers ainda não foi criado. Para evitar storeId vazio,
         * usamos a primeira loja cadastrada como fallback.
         */
        const fallbackStore = stores[0] || null;

        const selectedStore =
          savedStore || membershipStore || ownedStore || fallbackStore;

        if (selectedStore?.id) {
          localStorage.setItem(SELECTED_STORE_KEY, String(selectedStore.id));
        }

        setCurrentStore(selectedStore);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar loja atual:', error);

        if (!isMounted) return;

        setCurrentStore(null);
        setLoading(false);
      }
    };

    loadTenant();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const value = useMemo<TenantContextValue>(
    () => ({
      currentStore,
      storeId: currentStore?.id ? String(currentStore.id) : null,
      loading,
    }),
    [currentStore, loading],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
