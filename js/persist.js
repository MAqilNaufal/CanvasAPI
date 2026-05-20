// localStorage project persistence.
// Index: localStorage['canvas:projects'] = [{id, name, w, h, updatedAt}]
// Project: localStorage['canvas:project:'+id] = full JSON {meta, canvasJSON}
const Persist = (() => {
  const IDX_KEY = 'canvas:projects';
  const PROJ_PREFIX = 'canvas:project:';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadIndex() {
    try { return JSON.parse(localStorage.getItem(IDX_KEY) || '[]'); }
    catch { return []; }
  }

  function saveIndex(idx) {
    localStorage.setItem(IDX_KEY, JSON.stringify(idx));
  }

  return {
    list() {
      return loadIndex().sort((a, b) => b.updatedAt - a.updatedAt);
    },
    save(meta, canvasJSON) {
      const id = meta.id || uid();
      const idx = loadIndex();
      const entry = {
        id,
        name: meta.name || 'Untitled',
        w: meta.w,
        h: meta.h,
        updatedAt: Date.now()
      };
      const i = idx.findIndex(e => e.id === id);
      if (i >= 0) idx[i] = entry; else idx.push(entry);
      saveIndex(idx);
      localStorage.setItem(PROJ_PREFIX + id, JSON.stringify({ meta: entry, canvasJSON }));
      return id;
    },
    load(id) {
      try { return JSON.parse(localStorage.getItem(PROJ_PREFIX + id)); }
      catch { return null; }
    },
    remove(id) {
      const idx = loadIndex().filter(e => e.id !== id);
      saveIndex(idx);
      localStorage.removeItem(PROJ_PREFIX + id);
    },
    newId: uid
  };
})();
