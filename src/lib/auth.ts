import { supabase } from '@/lib/supabase';
import { db, resolveStoreId } from '@/lib/db';

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
};

export const signUp = async (name: string, email: string, password: string, storeName: string) => {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Não foi possível criar o usuário.');

  return createInitialTenantForUser({
    userId: data.user.id,
    name,
    email,
    storeName,
  });
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const createInitialTenantForUser = async ({
  userId,
  name,
  email,
  storeName,
}: {
  userId: string;
  name: string;
  email: string;
  storeName: string;
}) => {
  const storeId = crypto.randomUUID();
  const now = new Date().toISOString();
  const month = now.slice(0, 7);

  // 1. Limpa cache local de lojas/sessões anteriores para evitar conflito de tenant
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('vidlytics_stores');
      localStorage.removeItem('vidlytics_store_settings');
      localStorage.setItem('vidlytics_current_store_id', storeId);
      localStorage.setItem('current_store_id', storeId);
      localStorage.setItem('store_id', storeId);
    }
  } catch (e) {
    console.warn('Falha ao redefinir storage de loja:', e);
  }

  // 2. Cria a loja vinculada ao owner_user_id (o trigger trg_set_trial_defaults aplicará o trial de 7 dias e o plano no Postgres)
  await db.stores.save({
    id: storeId,
    name: storeName,
    url: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'empresa',
    active: true,
    owner_user_id: userId,
    created_at: now,
  });

  // 3. Registra associação de membro owner
  await db.storeMembers.save({
    id: crypto.randomUUID(),
    store_id: storeId,
    user_id: userId,
    role: 'owner',
    created_at: now,
  });

  // 4. Cria contadores de consumo iniciais
  await db.usageCounters.save({
    id: crypto.randomUUID(),
    store_id: storeId,
    month,
    videos_count: 0,
    views_count: 0,
    users_count: 1,
    created_at: now,
    updated_at: now,
  });

  return { storeId };
};

export const getTenantForUser = async (userId: string) => {
  const members = await db.storeMembers.getAll();
  const member = members.find((item) => item.user_id === userId);
  if (!member) return null;

  const stores = await db.stores.getAll();
  return stores.find((store) => store.id === member.store_id) || null;
};

export const resolveCurrentStoreId = async () => {
  const user = await getCurrentUser();
  if (!user) return resolveStoreId();

  const store = await getTenantForUser(user.id);
  return store?.id || resolveStoreId();
};
