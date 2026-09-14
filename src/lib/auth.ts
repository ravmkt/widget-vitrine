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

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
};

export const ensureUserTenantAtomics = async (user: any, customStoreName?: string) => {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (!user?.id) throw new Error('Usuário inválido para provisionamento de tenant.');

  const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Empresa';
  const finalStoreName = customStoreName || user.user_metadata?.store_name || `Loja de ${userName}`;

  try {
    // 1. Tenta procedure atômica (SECURITY DEFINER no Postgres)
    const { data, error } = await supabase.rpc('create_or_get_user_tenant', {
      p_user_id: user.id,
      p_user_name: userName,
      p_user_email: user.email || '',
      p_store_name: finalStoreName,
    });

    if (!error && data?.store_id) {
      const storeId = data.store_id;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('vidlytics_current_store_id', storeId);
        localStorage.setItem('current_store_id', storeId);
        localStorage.setItem('store_id', storeId);
      }
      return { storeId, isNew: data?.is_new };
    }

    if (error) {
      console.warn('[Auth] Falha na RPC create_or_get_user_tenant, acionando fallback local:', error.message);
    }
  } catch (rpcErr) {
    console.warn('[Auth] Erro ao invocar RPC:', rpcErr);
  }

  // 2. Fallback direto caso a RPC ainda não tenha sido aplicada no banco
  const existingStore = await getTenantForUser(user.id);
  if (existingStore?.id) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('vidlytics_current_store_id', existingStore.id);
      localStorage.setItem('current_store_id', existingStore.id);
      localStorage.setItem('store_id', existingStore.id);
    }
    return { storeId: existingStore.id, isNew: false };
  }

  const { storeId } = await createInitialTenantForUser({
    userId: user.id,
    name: userName,
    email: user.email || '',
    storeName: finalStoreName,
  });

  return { storeId, isNew: true };
};

export const getTenantForUser = async (userId: string) => {
  if (!supabase) return null;

  // Busca a loja diretamente pelo owner_user_id no Supabase
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (store) return store;

  // Fallback por store_members
  const { data: member } = await supabase
    .from('store_members')
    .select('store_id, stores(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return (member as any)?.stores || null;
};

export const resolveCurrentStoreId = async () => {
  const user = await getCurrentUser();
  if (!user) return resolveStoreId();

  const store = await getTenantForUser(user.id);
  if (store?.id) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('vidlytics_current_store_id', store.id);
    }
    return store.id;
  }

  return resolveStoreId();
};
