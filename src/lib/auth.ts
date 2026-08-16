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

  // Executa procedure atômica no banco de dados (previne race condition e estado parcial)
  const { data, error } = await supabase.rpc('create_or_get_user_tenant', {
    p_user_id: user.id,
    p_user_name: userName,
    p_user_email: user.email || '',
    p_store_name: finalStoreName,
  });

  if (error) {
    console.error('[Auth] Erro na procedure create_or_get_user_tenant:', error);
    throw error;
  }

  const storeId = data?.store_id;
  if (storeId && typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('vidlytics_current_store_id', storeId);
    localStorage.setItem('current_store_id', storeId);
    localStorage.setItem('store_id', storeId);
  }

  return { storeId, isNew: data?.is_new };
};

export const signUp = async (name: string, email: string, password: string, storeName: string) => {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, store_name: storeName },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Não foi possível criar o usuário.');

  return ensureUserTenantAtomics(data.user, storeName);
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
  const { error: memberError } = await supabase
    .from('store_members')
    .insert({
      id: crypto.randomUUID(),
      store_id: storeId,
      user_id: userId,
      role: 'owner',
      created_at: now,
    });

  if (memberError) {
    console.warn('[Auth] Aviso ao vincular membro (fallback silencioso):', memberError);
  }

  // 3.1. Cria as configurações padrão da nova loja no Supabase
  const { error: settingsError } = await supabase
    .from('store_settings')
    .insert({
      id: crypto.randomUUID(),
      store_id: storeId,
      store_name: storeName,
      store_url: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      contact_email: email,
      app_enabled: true,
      stories_enabled: true,
      carousel_enabled: true,
      floating_widget_enabled: true,
      widget_enabled: true,
      open_product_new_tab: true,
      autoplay: true,
      muted_by_default: true,
      show_video_controls: false,
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      created_at: now,
    });

  if (settingsError) {
    console.warn('[Auth] Aviso ao criar store_settings padrão:', settingsError);
  }

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
