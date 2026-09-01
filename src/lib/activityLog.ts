import { supabase } from '@/lib/supabase';
import { resolveStoreId, isValidUuid } from '@/lib/db';

/**
 * Códigos de ações do Log do Painel (Visão Geral → Atividade Recente).
 * Setores: vídeos, stories, produtos, medidas, configurações, aparências,
 * comentários e armazenamento.
 */
export type ActivityAction =
  // 🎬 Vídeos
  | 'video.created'
  | 'video.updated'
  | 'video.deleted'
  // 📱 Stories
  | 'story.created'
  | 'story.updated'
  | 'story.deleted'
  | 'story.activated'
  | 'story.deactivated'
  // 🛍️ Produtos
  | 'product.created'
  | 'product.updated'
  | 'product.activated'
  | 'product.deactivated'
  | 'product.deleted'
  | 'product.imported'
  // 📏 Medidas (modelos de medidas)
  | 'model.created'
  | 'model.updated'
  | 'model.deleted'
  // ⚙️ Configurações
  | 'settings.saved'
  // 🎨 Aparências
  | 'appearance.created'
  | 'appearance.updated'
  | 'appearance.default'
  | 'appearance.deleted'
  // 💬 Comentários
  | 'comment.deleted'
  // 💾 Armazenamento
  | 'storage.file_deleted';

/**
 * Registra uma atividade do lojista no log do painel.
 * Falhas são silenciosas (apenas warn no console) para nunca travar a ação do usuário.
 *
 * @param action  Código da ação (ex.: 'video.deleted')
 * @param target  Nome específico do item afetado (ex.: 'Jaqueta Jeans')
 * @param explicitStoreId  Opcional: store_id já resolvido pela página chamadora
 */
export async function logPanelActivity(
  action: ActivityAction,
  target?: string | null,
  explicitStoreId?: string,
): Promise<void> {
  try {
    if (!supabase) return;

    const storeId =
      explicitStoreId && isValidUuid(explicitStoreId)
        ? explicitStoreId
        : await resolveStoreId();

    if (!isValidUuid(storeId)) return;

    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id ?? null;
    } catch {
      userId = null;
    }

    const { error } = await supabase.from('activity_logs').insert({
      store_id: storeId,
      user_id: userId,
      action,
      details: target ? String(target).trim().slice(0, 300) : null,
    });

    if (error) {
      console.warn('[ActivityLog] Não foi possível registrar a atividade:', error.message);
    }
  } catch (e) {
    console.warn('[ActivityLog] Falha ao registrar atividade:', e);
  }
}
