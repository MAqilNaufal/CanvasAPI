// Templates: built-in JSON files + user-saved in localStorage.
const Templates = (() => {
  const USER_KEY = 'canvas:userTemplates';
  const INDEX_FILE = 'templates/index.json';

  let builtins = [];
  let users = [];

  async function loadBuiltins() {
    try {
      const r = await fetch(INDEX_FILE);
      if (!r.ok) return [];
      const files = await r.json();
      const out = [];
      for (const f of files) {
        try {
          const tr = await fetch('templates/' + f);
          if (tr.ok) out.push(await tr.json());
        } catch {}
      }
      return out;
    } catch { return []; }
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(arr) {
    localStorage.setItem(USER_KEY, JSON.stringify(arr));
  }

  function all() {
    return [...builtins, ...users];
  }

  function get(id) {
    return all().find(t => t.id === id) || null;
  }

  function upsert(tpl) {
    if (tpl.builtin) return;
    if (!tpl.id) tpl.id = 'tpl-' + Date.now().toString(36);
    tpl.updatedAt = Date.now();
    const i = users.findIndex(t => t.id === tpl.id);
    if (i >= 0) users[i] = tpl; else users.push(tpl);
    saveUsers(users);
    return tpl.id;
  }

  function remove(id) {
    const t = users.find(x => x.id === id);
    if (!t) return;
    users = users.filter(x => x.id !== id);
    saveUsers(users);
  }

  function makeThumbnail(canvas, maxW = 300) {
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const mult = Math.min(maxW / w, maxW / h);
    return canvas.toDataURL({ format: 'png', multiplier: mult });
  }

  async function init() {
    builtins = await loadBuiltins();
    users = loadUsers();
  }

  return {
    init,
    all,
    get,
    upsert,
    remove,
    makeThumbnail,
    get builtins() { return builtins; },
    get users() { return users; }
  };
})();
