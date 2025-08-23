// Tiny event backplane for goblin modules.
// Port shape (as per README):
// type Port = { on(fn): () => void; emit(e): void };

export function port() {
  const subs = new Set();
  return {
    on(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    emit(e) {
      for (const fn of subs) fn(e);
    },
  };
}

/**
 * Connect a source port to a destination sink (port or function).
 * Options:
 *  - filter?: (e) => boolean
 *  - map?: (e) => any
 *  - thru?: (e) => void    // observe side-effects inline
 */
export function connect(src, dst, opts = {}) {
  const isFnSink = typeof dst === "function";
  const emitToDst = (e) => {
    if (isFnSink) return dst(e);
    if (dst && typeof dst.emit === "function") dst.emit(e);
  };

  const unsub = src.on((ev) => {
    if (opts.filter && !opts.filter(ev)) return;
    const mapped = opts.map ? opts.map(ev) : ev;
    if (opts.thru) opts.thru(mapped);
    emitToDst(mapped);
  });
  return function unplug() {
    unsub && unsub();
  };
}

/**
 * Fan‑out: connect one src to many dsts.
 * Returns a single unplug() that tears down all.
 */
export function tee(src, ...dsts) {
  const unsubs = dsts.map((d) => connect(src, d));
  return () => unsubs.forEach((u) => u && u());
}

/**
 * Create a simple topic bus keyed by a field (default: 'type').
 * Returns { port, route(type, handler), off(type, handler) }.
 */
export function topicBus(key = "type") {
  const p = port();
  const table = new Map(); // type -> Set<handler>
  p.on((e) => {
    const t = e && e[key];
    if (!table.has(t)) return;
    for (const h of table.get(t)) h(e);
  });
  return {
    port: p,
    route(type, handler) {
      if (!table.has(type)) table.set(type, new Set());
      table.get(type).add(handler);
      return () => this.off(type, handler);
    },
    off(type, handler) {
      const set = table.get(type);
      if (!set) return;
      set.delete(handler);
      if (!set.size) table.delete(type);
    },
  };
}

/**
 * Utility adapters
 */
export const adapters = {
  // Map a port’s events to a new shape; returns a new Port.
  map(src, mapFn) {
    const out = port();
    connect(src, out, { map: mapFn });
    return out;
  },
  // Filter a port’s events; returns a new Port.
  filter(src, pred) {
    const out = port();
    connect(src, out, { filter: pred });
    return out;
  },
};
