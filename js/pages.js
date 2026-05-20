// Multi-page state. Single Fabric canvas instance swaps between page JSONs.
// Page: { id, w, h, canvasJSON, thumbnail }
const Pages = (() => {
  let canvas = null;
  let pages = [];
  let active = 0;
  let onChange = null;
  let suspended = false;  // skip auto-snapshot during swap

  function uid() {
    return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function snapshotCurrent() {
    if (!canvas || suspended || !pages[active]) return;
    const p = pages[active];
    p.canvasJSON = canvas.toJSON();
    p.w = canvas.getWidth();
    p.h = canvas.getHeight();
    p.thumbnail = makeThumb();
  }

  function makeThumb(maxW = 160) {
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const mult = Math.min(maxW / w, maxW / h, 1);
    try { return canvas.toDataURL({ format: 'png', multiplier: mult }); }
    catch { return null; }
  }

  function loadPage(idx) {
    if (idx < 0 || idx >= pages.length) return Promise.resolve();
    const p = pages[idx];
    return new Promise(res => {
      suspended = true;
      canvas.setWidth(p.w);
      canvas.setHeight(p.h);
      canvas.loadFromJSON(p.canvasJSON || { background: '#ffffff', objects: [] }, () => {
        canvas.renderAll();
        suspended = false;
        if (typeof Editor !== 'undefined' && Editor.fit) Editor.fit();
        if (typeof History !== 'undefined') History.reset();
        if (onChange) onChange(idx, pages);
        res();
      });
    });
  }

  async function setActive(idx) {
    if (idx === active) return;
    snapshotCurrent();
    active = idx;
    await loadPage(idx);
  }

  async function add(opts = {}) {
    snapshotCurrent();
    const cur = pages[active] || {};
    const p = {
      id: uid(),
      w: opts.w || cur.w || canvas.getWidth(),
      h: opts.h || cur.h || canvas.getHeight(),
      canvasJSON: opts.canvasJSON || { background: '#ffffff', objects: [] },
      thumbnail: null
    };
    pages.splice(active + 1, 0, p);
    active = active + 1;
    await loadPage(active);
  }

  async function duplicate() {
    snapshotCurrent();
    const cur = pages[active];
    if (!cur) return;
    const copy = {
      id: uid(),
      w: cur.w,
      h: cur.h,
      canvasJSON: JSON.parse(JSON.stringify(cur.canvasJSON || {})),
      thumbnail: cur.thumbnail
    };
    pages.splice(active + 1, 0, copy);
    active = active + 1;
    await loadPage(active);
  }

  async function remove(idx) {
    if (pages.length <= 1) return;
    pages.splice(idx, 1);
    if (active >= pages.length) active = pages.length - 1;
    else if (idx < active) active--;
    await loadPage(active);
  }

  async function move(from, to) {
    if (from === to || to < 0 || to >= pages.length) return;
    snapshotCurrent();
    const [p] = pages.splice(from, 1);
    pages.splice(to, 0, p);
    if (active === from) active = to;
    else if (from < active && to >= active) active--;
    else if (from > active && to <= active) active++;
    if (onChange) onChange(active, pages);
  }

  function serialize() {
    snapshotCurrent();
    return { pages, active };
  }

  async function load(data) {
    pages = (data?.pages?.length ? data.pages : [{
      id: uid(),
      w: canvas.getWidth(),
      h: canvas.getHeight(),
      canvasJSON: { background: '#ffffff', objects: [] },
      thumbnail: null
    }]);
    active = Math.min(data?.active || 0, pages.length - 1);
    await loadPage(active);
  }

  function reset() {
    pages = [{
      id: uid(),
      w: canvas.getWidth(),
      h: canvas.getHeight(),
      canvasJSON: { background: '#ffffff', objects: [] },
      thumbnail: null
    }];
    active = 0;
    if (onChange) onChange(active, pages);
  }

  function init(c, cb) {
    canvas = c;
    onChange = cb;
    reset();
  }

  return {
    init,
    add,
    duplicate,
    remove,
    move,
    setActive,
    snapshotCurrent,
    serialize,
    load,
    reset,
    get pages() { return pages; },
    get active() { return active; }
  };
})();
