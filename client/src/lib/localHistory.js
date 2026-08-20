/**
 * Local run history, stored in IndexedDB.
 *
 * The browser computes every rewrite, so the browser is also where a run
 * naturally lives. This keeps the *complete* run -- full metrics, diff, trace
 * and plan -- not a summary, which is what makes local-only mode equivalent
 * to server history rather than a downgrade: reopening an entry restores
 * exactly what you saw when you made it.
 *
 * IndexedDB rather than localStorage because a run with its trace can be
 * tens of kilobytes and localStorage caps out around 5 MB for the whole
 * origin, with synchronous writes on the main thread.
 */

const DB_NAME = 'humaninzer';
const DB_VERSION = 1;
const STORE = 'runs';
const LEGACY_KEY = 'humaninzer.history.v1';
const LIMIT = 200;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('favorite', 'favorite');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx(mode, run) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try {
      result = run(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result && result.__request ? result.__request.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

const wrap = (request) => ({ __request: request });

/** A stored entry: the whole run, plus the fields the list view needs. */
function toEntry(result) {
  const id = result.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    local: !result.id,
    title: result.title || deriveTitle(result.original),
    contentOriginal: result.original ?? result.contentOriginal ?? '',
    contentParaphrased: result.paraphrased ?? result.contentParaphrased ?? '',
    options: result.options || {},
    // Kept in full, so reopening restores the complete result.
    metrics: result.metrics || null,
    diff: result.diff || null,
    trace: result.trace || [],
    traceSummary: result.traceSummary || [],
    plan: result.plan || null,
    passes: result.passes || [],
    summary: result.summary || null,
    seed: result.options?.seed ?? result.seed ?? null,
    engine: result.engine || result.options?.engine || 'rules',
    favorite: Boolean(result.favorite),
    version: result.version || 1,
    parentId: result.parentId || null,
    createdAt: result.createdAt || new Date().toISOString(),
  };
}

export const localHistory = {
  /** Newest first. */
  async list(limit = LIMIT) {
    const items = await tx('readonly', (store) => wrap(store.getAll()));
    return (items || [])
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit);
  },

  async get(id) {
    return tx('readonly', (store) => wrap(store.get(id)));
  },

  /** Insert or replace, then prune the oldest entries past the cap. */
  async add(result) {
    const entry = toEntry(result);
    await tx('readwrite', (store) => store.put(entry));
    await this.prune();
    return entry;
  },

  async update(id, changes) {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...changes };
    await tx('readwrite', (store) => store.put(updated));
    return updated;
  },

  async remove(id) {
    await tx('readwrite', (store) => store.delete(id));
  },

  async clear() {
    await tx('readwrite', (store) => store.clear());
  },

  async prune(limit = LIMIT) {
    const all = await this.list(Number.MAX_SAFE_INTEGER);
    const excess = all.slice(limit);
    if (!excess.length) return 0;
    await tx('readwrite', (store) => {
      for (const item of excess) store.delete(item.id);
    });
    return excess.length;
  },

  /**
   * Import runs kept by the previous localStorage version. Runs once; the old
   * entries only carried a metrics summary, so they restore their text but
   * not a full result -- which is exactly why this format replaced it.
   */
  async migrateLegacy() {
    let raw;
    try {
      raw = localStorage.getItem(LEGACY_KEY);
    } catch {
      return 0;
    }
    if (!raw) return 0;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
      return 0;
    }

    for (const item of parsed) {
      await tx('readwrite', (store) => store.put(toEntry({ ...item, original: item.contentOriginal, paraphrased: item.contentParaphrased })));
    }
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
    return parsed.length;
  },
};

function deriveTitle(text = '') {
  const first = String(text).trim().split('\n')[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}...` : first || 'Untitled run';
}

export default localHistory;
