// A bounded in-memory GET cache. Each client owns an instance; credentials are part of its keys.
// Aborting one caller never aborts another caller's shared request.
export function createQueryCache({ maxEntries = 100, ttl = 15000 } = {}) {
  const entries = new Map();
  function clear() { entries.clear(); }
  function get(key, fetcher, signal) {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    let entry = entries.get(key);
    if (!entry || (entry.expires <= Date.now() && !entry.pending)) {
      entry = { pending: true, expires: Infinity };
      entries.set(key, entry);
      entry.promise = Promise.resolve().then(fetcher).then(value => {
        entry.pending = false; entry.expires = Date.now() + ttl; return value;
      }, error => { if (entries.get(key) === entry) entries.delete(key); throw error; });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    }
    if (!signal) return entry.promise;
    return new Promise((resolve, reject) => {
      const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
      const cleanup = () => signal.removeEventListener('abort', abort);
      signal.addEventListener('abort', abort, { once: true });
      entry.promise.then(value => { cleanup(); if (!signal.aborted) resolve(value); }, error => { cleanup(); reject(error); });
    });
  }
  return { get, clear };
}
