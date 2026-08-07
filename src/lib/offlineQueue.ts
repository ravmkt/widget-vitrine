// ── Fila de retry offline ──────────────────────────────────
// Enfileira operações quando offline e as reenvia quando a rede volta.

type QueueItem = {
  id: string;
  operation: string;
  payload: any;
  timestamp: number;
  retries: number;
};

const STORAGE_KEY = 'story_offline_queue';
const MAX_RETRIES = 5;

function getQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/** Adiciona operação à fila */
export function enqueue(operation: string, payload: any) {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    operation,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });
  saveQueue(queue);
}

export type OfflineHandlers = Record<string, (payload: any) => Promise<void>>;

/** Processa a fila com os handlers fornecidos */
export async function processQueue(handlers: OfflineHandlers) {
  const queue = getQueue();
  if (queue.length === 0) return;

  const remaining: QueueItem[] = [];

  for (const item of queue) {
    const handlerFn = handlers[item.operation];
    if (!handlerFn) continue; // remove operações órfãs

    try {
      await handlerFn(item.payload);
    } catch {
      if (item.retries < MAX_RETRIES) {
        remaining.push({ ...item, retries: item.retries + 1 });
      } else {
        console.warn(`[OfflineQueue] Descartando ${item.operation} após ${MAX_RETRIES} tentativas`);
      }
    }
  }

  saveQueue(remaining);

  if (remaining.length > 0) {
    const delay = Math.min(1000 * Math.pow(2, remaining[0].retries), 30000);
    setTimeout(() => processQueue(handlers), delay);
  }
}

/** Configura listeners de rede + polling periódico */
export function setupOfflineSync(handlers: OfflineHandlers) {
  window.addEventListener('online', () => processQueue(handlers));
  processQueue(handlers);

  setInterval(() => {
    if (navigator.onLine) processQueue(handlers);
  }, 30000);
}

export function getQueueLength(): number {
  return getQueue().length;
}
