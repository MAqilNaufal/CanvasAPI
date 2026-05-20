// Wires DOM ↔ Editor/Persist/History/Exporter/Props. Loads last project on boot.
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
    const json = Editor.canvas.toJSON();
    const id = Persist.save(meta, json);
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
    $('cw').value = p.meta.w;
    $('ch').value = p.meta.h;
    Editor.resize(p.meta.w, p.meta.h);
    await Editor.loadJSON(p.canvasJSON);
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
    Editor.clear();
    History.reset();
    state.dirty = false;
    setStatus('');
    localStorage.removeItem('canvas:lastOpen');
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
    $('projectName').oninput = markDirty;

    $('resizeBtn').onclick = () => {
      const w = parseInt($('cw').value, 10);
      const h = parseInt($('ch').value, 10);
      if (w >= 100 && h >= 100) {
        Editor.resize(w, h);
        markDirty();
      }
    };

    $('presetSize').onchange = e => {
      if (!e.target.value) return;
      const [w, h] = e.target.value.split('x').map(Number);
      $('cw').value = w;
      $('ch').value = h;
      Editor.resize(w, h);
      markDirty();
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
          // Accept either canvas JSON directly or {meta, canvasJSON}
          const cjson = obj.canvasJSON || obj;
          const meta = obj.meta || {};
          if (meta.w && meta.h) {
            $('cw').value = meta.w;
            $('ch').value = meta.h;
            Editor.resize(meta.w, meta.h);
          }
          if (meta.name) $('projectName').value = meta.name;
          state.id = null;
          await Editor.loadJSON(cjson);
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
      b.onclick = () => {
        Exporter.run(Editor.canvas, b.dataset.export, $('projectName').value || 'design');
        toggleMenu('export-menu');
      };
    });

    document.addEventListener('click', e => {
      if (e.target.closest('.menu') || e.target.closest('#openBtn') || e.target.closest('#exportBtn')) return;
      document.querySelectorAll('.menu').forEach(m => m.classList.remove('show'));
    });

    Editor.canvas.on('object:added', markDirty);
    Editor.canvas.on('object:modified', markDirty);
    Editor.canvas.on('object:removed', markDirty);
  }

  window.addEventListener('DOMContentLoaded', async () => {
    const canvas = Editor.init();
    Editor.fit();
    History.init(canvas);
    Props.init(document.getElementById('propsPanel'), canvas);
    bindUI();
    bindKeys();

    const last = localStorage.getItem('canvas:lastOpen');
    if (last && Persist.load(last)) await load(last);
  });
})();
