(function (global) {
  function port() {
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

  function connect(src, dst, opts) {
    opts = opts || {};
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

  function tee(src, ...dsts) {
    const unsubs = dsts.map((d) => connect(src, d));
    return () => unsubs.forEach((u) => u && u());
  }

  function topicBus(key) {
    key = key || "type";
    const p = port();
    const table = new Map();
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

  const adapters = {
    map(src, mapFn) {
      const out = port();
      connect(src, out, { map: mapFn });
      return out;
    },
    filter(src, pred) {
      const out = port();
      connect(src, out, { filter: pred });
      return out;
    },
  };

  global.Backplanika = { port, connect, tee, topicBus, adapters };
})(typeof window !== "undefined" ? window : globalThis);
