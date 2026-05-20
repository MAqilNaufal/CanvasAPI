// Wires DOM ↔ Editor/Persist/History/Pages/Brand/Templates/Exporter/Props.
(() => {
  const $ = id => document.getElementById(id);

  const state = {
    id: null,
    name: 'Untitled',
    dirty: false
  };

  function setStatus(msg, cls = '') {
    const s = $('saveStatus');
    s.textContent = msg;
    s.className = 'status ' + cls;
  }

  function markDirty() {
    if (!state.dirty) {
      state.dirty = true;
      setStatus('● unsaved', 'dirty');
    }
  }

  function getMeta() {
    return {
      id: state.id,
      name: $('projectName').value || 'Untitled',
      w: Editor.canvas.getWidth(),
      h: Editor.canvas.getHeight()
    };
  }

  function save() {
    const meta = getMeta();
    const data = Pages.serialize();
    const id = Persist.save(meta, data);
    state.id = id;
    state.name = meta.name;
    state.dirty = false;
    setStatus('✓ saved', 'ok');
    setTimeout(() => { if (!state.dirty) setStatus(''); }, 1500);
  }

  async function load(id) {
    const p = Persist.load(id);
    if (!p) return;
    state.id = id;
    state.name = p.meta.name;
    $('projectName').value = p.meta.name;

    // Migration: old single-canvas projects -> wrap into Pages
    let pagesData;
    if (p.canvasJSON?.pages) {
      pagesData = p.canvasJSON;
    } else {
      // Legacy: canvasJSON is raw fabric JSON
      pagesData = {
        pages: [{
          id: 'p-legacy',
          w: p.meta.w,
          h: p.meta.h,
          canvasJSON: p.canvasJSON,
          thumbnail: null
        }],
        active: 0
      };
    }
    await Pages.load(pagesData);
    syncSizeInputs();
    state.dirty = false;
    setStatus('loaded', 'ok');
    setTimeout(() => setStatus(''), 1200);
    localStorage.setItem('canvas:lastOpen', id);
  }

  function newProject() {
    if (state.dirty && !confirm('Discard unsaved changes?')) return;
    state.id = null;
    state.name = 'Untitled';
    $('projectName').value = '';
    Pages.reset();
    Editor.clear();
    History.reset();
    syncSizeInputs();
    state.dirty = false;
    setStatus('');
    localStorage.removeItem('canvas:lastOpen');
  }

  function syncSizeInputs() {
    $('cw').value = Editor.canvas.getWidth();
    $('ch').value = Editor.canvas.getHeight();
  }

  function renderProjectList() {
    const ul = $('projectList');
    ul.innerHTML = '';
    const list = Persist.list();
    if (!list.length) {
      ul.innerHTML = '<li style="opacity:.5;cursor:default">No projects yet</li>';
      return;
    }
    for (const p of list) {
      const li = document.createElement('li');
      const date = new Date(p.updatedAt).toLocaleDateString();
      li.innerHTML = `<span>${p.name}</span><span class="meta">${p.w}×${p.h} · ${date}</span>`;
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '×';
      del.title = 'Delete';
      del.onclick = ev => {
        ev.stopPropagation();
        if (!confirm(`Delete "${p.name}"?`)) return;
        Persist.remove(p.id);
        if (state.id === p.id) newProject();
        renderProjectList();
      };
      li.appendChild(del);
      li.onclick = () => {
        load(p.id);
        $('open-menu').classList.remove('show');
      };
      ul.appendChild(li);
    }
  }

  function toggleMenu(id) {
    document.querySelectorAll('.menu').forEach(m => {
      if (m.id === id) m.classList.toggle('show');
      else m.classList.remove('show');
    });
    if (id === 'open-menu' && $(id).classList.contains('show')) renderProjectList();
  }

  function bindKeys() {
    document.addEventListener('keydown', e => {
      const t = e.target;
      const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (isTyping) return;
        e.preventDefault();
        History.undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (isTyping) return;
        e.preventDefault();
        History.redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        if (Editor.canvas.getActiveObject()) {
          e.preventDefault();
          Editor.deleteSelected();
        }
      }
    });
  }

  function bindUI() {
    $('newBtn').onclick = newProject;
    $('saveBtn').onclick = save;
    $('openBtn').onclick = () => toggleMenu('open-menu');
    $('exportBtn').onclick = () => toggleMenu('export-menu');
    $('brandBtn').onclick = () => { toggleMenu('brand-menu'); BrandUI.render(); };
    $('templatesBtn').onclick = () => { toggleMenu('templates-menu'); TemplatesUI.render(); };
    $('projectName').oninput = markDirty;

    $('resizeBtn').onclick = () => {
      const w = parseInt($('cw').value, 10);
      const h = parseInt($('ch').value, 10);
      if (w >= 100 && h >= 100) {
        Editor.resize(w, h);
        markDirty();
        PagesUI.render();
      }
    };

    $('presetSize').onchange = e => {
      if (!e.target.value) return;
      const [w, h] = e.target.value.split('x').map(Number);
      $('cw').value = w;
      $('ch').value = h;
      Editor.resize(w, h);
      markDirty();
      PagesUI.render();
      e.target.value = '';
    };

    $('addText').onclick = () => Editor.addText();
    $('addRect').onclick = () => Editor.addRect();
    $('addCircle').onclick = () => Editor.addCircle();
    $('addLine').onclick = () => Editor.addLine();
    $('del').onclick = Editor.deleteSelected;
    $('up').onclick = Editor.bringForward;
    $('down').onclick = Editor.sendBackward;
    $('undo').onclick = History.undo;
    $('redo').onclick = History.redo;

    $('imgInput').onchange = e => {
      [...e.target.files].forEach(f => Editor.addImageFromFile(f));
      e.target.value = '';
    };

    $('importInput').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async ev => {
        try {
          const obj = JSON.parse(ev.target.result);
          const meta = obj.meta || {};
          if (meta.name) $('projectName').value = meta.name;
          state.id = null;
          // Accept three shapes:
          //   {meta, canvasJSON: {pages, active}}  (full project export)
          //   {meta, canvasJSON: <fabric JSON>}    (legacy)
          //   <fabric JSON>                        (raw)
          if (obj.canvasJSON?.pages) {
            await Pages.load(obj.canvasJSON);
          } else if (obj.canvasJSON) {
            await Pages.load({
              pages: [{
                id: 'p-imp',
                w: meta.w || Editor.canvas.getWidth(),
                h: meta.h || Editor.canvas.getHeight(),
                canvasJSON: obj.canvasJSON
              }],
              active: 0
            });
          } else {
            await Pages.load({
              pages: [{
                id: 'p-imp',
                w: meta.w || Editor.canvas.getWidth(),
                h: meta.h || Editor.canvas.getHeight(),
                canvasJSON: obj
              }],
              active: 0
            });
          }
          syncSizeInputs();
          markDirty();
          toggleMenu('open-menu');
        } catch (err) {
          alert('Invalid JSON: ' + err.message);
        }
      };
      r.readAsText(f);
      e.target.value = '';
    };

    document.querySelectorAll('#export-menu button').forEach(b => {
      b.onclick = async () => {
        const name = $('projectName').value || 'design';
        if (b.dataset.export === 'pdf') {
          Pages.snapshotCurrent();
          await PdfExporter.exportPDF(Pages.pages, name);
        } else if (b.dataset.export === 'json') {
          // Export full project including pages
          const blob = new Blob([JSON.stringify({
            meta: getMeta(),
            canvasJSON: Pages.serialize()
          }, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(name || 'design').replace(/[^\w-]+/g, '_')}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          Exporter.run(Editor.canvas, b.dataset.export, name);
        }
        toggleMenu('export-menu');
      };
    });

    document.addEventListener('click', e => {
      if (e.target.closest('.menu') || e.target.closest('#openBtn') || e.target.closest('#exportBtn') || e.target.closest('#brandBtn') || e.target.closest('#templatesBtn')) return;
      document.querySelectorAll('.menu').forEach(m => m.classList.remove('show'));
    });

    Editor.canvas.on('object:added', markDirty);
    Editor.canvas.on('object:modified', () => { markDirty(); PagesUI.render(); });
    Editor.canvas.on('object:removed', markDirty);
  }

  window.addEventListener('DOMContentLoaded', async () => {
    const canvas = Editor.init();
    Editor.fit();
    History.init(canvas);
    Props.init(document.getElementById('propsPanel'), canvas);

    PagesUI.init(document.getElementById('pagesBar'));
    Pages.init(canvas, () => { PagesUI.render(); syncSizeInputs(); });

    BrandUI.init(document.getElementById('brand-menu'), document.getElementById('logoInput'));
    await Brand.init(canvas, () => BrandUI.render());

    TemplatesUI.init(document.getElementById('templates-menu'), {
      getCanvas: () => Editor.canvas,
      onLoad: async tpl => {
        if (state.dirty && !confirm('Discard unsaved changes and load template?')) return;
        state.id = null;
        $('projectName').value = tpl.name;
        await Pages.load({
          pages: [{
            id: 'p-tpl',
            w: tpl.w,
            h: tpl.h,
            canvasJSON: tpl.canvasJSON
          }],
          active: 0
        });
        syncSizeInputs();
        state.dirty = true;
        setStatus('● from template', 'dirty');
        toggleMenu('templates-menu');
      }
    });
    await Templates.init();

    bindUI();
    bindKeys();

    const last = localStorage.getItem('canvas:lastOpen');
    if (last && Persist.load(last)) await load(last);
    else PagesUI.render();
  });
})();
