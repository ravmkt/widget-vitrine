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

  await db.profiles.save({
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    email,
    created_at: now,
  });

  await db.stores.save({
    id: storeId,
    name: storeName,
    domain: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'empresa',
    active: true,
    created_at: now,
  });

  await db.storeMembers.save({
    id: crypto.randomUUID(),
    store_id: storeId,
    user_id: userId,
    role: 'owner',
    created_at: now,
  });

  await db.subscriptions.save({
    id: crypto.randomUUID(),
    store_id: storeId,
    plan_name: 'Essencial',
    status: 'trialing',
    current_period_start: now,
    current_period_end: now,
    created_at: now,
  });

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
