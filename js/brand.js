// Brand kit: colors, fonts, logos. Built-in kits ship as /brand/*.json.
// User kits persist in localStorage. Active kit id in localStorage['canvas:activeKit'].
const Brand = (() => {
  const KITS_KEY = 'canvas:kits';
  const ACTIVE_KEY = 'canvas:activeKit';
  const BUILTIN_FILES = ['brand/default.json', 'brand/lippo.json'];

  let kits = [];   // merged builtin + user
  let activeId = null;
  let canvas = null;
  let onChange = null;

  async function loadBuiltins() {
    const out = [];
    for (const path of BUILTIN_FILES) {
      try {
        const r = await fetch(path);
        if (r.ok) out.push(await r.json());
      } catch {}
    }
    return out;
  }

  function loadUserKits() {
    try { return JSON.parse(localStorage.getItem(KITS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUserKits(arr) {
    localStorage.setItem(KITS_KEY, JSON.stringify(arr.filter(k => !k.builtin)));
  }

  function active() {
    return kits.find(k => k.id === activeId) || kits[0];
  }

  function upsert(kit) {
    if (!kit.id) kit.id = 'kit-' + Date.now().toString(36);
    const i = kits.findIndex(k => k.id === kit.id);
    if (i >= 0) kits[i] = kit; else kits.push(kit);
    saveUserKits(kits);
  }

  function remove(id) {
    const k = kits.find(x => x.id === id);
    if (!k || k.builtin) return;
    kits = kits.filter(x => x.id !== id);
    saveUserKits(kits);
    if (activeId === id) setActive(kits[0]?.id);
  }

  function setActive(id) {
    activeId = id;
    localStorage.setItem(ACTIVE_KEY, id);
    if (onChange) onChange(active());
  }

  function applyColor(hex, target = 'auto') {
    const o = canvas.getActiveObject();
    if (!o) return false;
    if (target === 'stroke') o.set('stroke', hex);
    else if (target === 'fill') o.set('fill', hex);
    else {
      // auto: text → fill; shapes with no fill → stroke; default → fill
      if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') o.set('fill', hex);
      else if (!o.fill || o.fill === 'transparent') o.set('stroke', hex);
      else o.set('fill', hex);
    }
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: o });
    return true;
  }

  function applyFont(family) {
    const o = canvas.getActiveObject();
    if (!o || !(o.type === 'textbox' || o.type === 'i-text' || o.type === 'text')) return false;
    o.set('fontFamily', family);
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: o });
    return true;
  }

  function addLogo(kit, dataUrl, name) {
    kit.logos = kit.logos || [];
    kit.logos.push({ name: name || 'logo', dataUrl });
    upsert(kit);
  }

  function dropLogo(kit, idx) {
    kit.logos.splice(idx, 1);
    upsert(kit);
  }

  function placeLogo(dataUrl) {
    fabric.Image.fromURL(dataUrl, img => {
      const max = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.25;
      const scale = Math.min(max / img.width, max / img.height, 1);
      img.set({
        left: 40,
        top: 40,
        scaleX: scale,
        scaleY: scale
      });
      canvas.add(img).setActiveObject(img);
    });
  }

  async function init(c, changeCb) {
    canvas = c;
    onChange = changeCb;
    const builtins = await loadBuiltins();
    const users = loadUserKits();
    kits = [...builtins, ...users];
    activeId = localStorage.getItem(ACTIVE_KEY) || kits[0]?.id || null;
    if (onChange) onChange(active());
  }

  return {
    init,
    get kits() { return kits; },
    active,
    setActive,
    upsert,
    remove,
    applyColor,
    applyFont,
    addLogo,
    dropLogo,
    placeLogo
  };
})();
