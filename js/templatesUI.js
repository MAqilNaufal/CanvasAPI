// Templates drawer: grid of cards, click to instantiate, save current as template.
const TemplatesUI = (() => {
  let drawer = null;
  let onLoadTemplate = null;
  let getCurrentCanvas = null;

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
      else if (k === 'html') e.innerHTML = v;
      else if (v !== undefined && v !== null) e.setAttribute(k, v);
    }
    for (const c of children) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  }

  function card(tpl) {
    const aspect = tpl.w / tpl.h;
    const box = el('div', { class: 'tpl-card', title: tpl.name }, []);
    const thumb = el('div', { class: 'tpl-thumb', style: `aspect-ratio:${aspect}` }, []);
    if (tpl.thumbnail) {
      thumb.style.backgroundImage = `url(${tpl.thumbnail})`;
      thumb.style.backgroundSize = 'cover';
      thumb.style.backgroundPosition = 'center';
    } else {
      thumb.appendChild(el('div', { class: 'tpl-placeholder' }, [`${tpl.w}×${tpl.h}`]));
    }
    box.appendChild(thumb);
    box.appendChild(el('div', { class: 'tpl-meta' }, [
      el('div', { class: 'tpl-name' }, [tpl.name]),
      el('div', { class: 'tpl-size' }, [tpl.builtin ? 'Built-in' : 'My template'])
    ]));
    box.onclick = () => onLoadTemplate(tpl);
    if (!tpl.builtin) {
      const del = el('button', { class: 'del', title: 'Delete' }, ['×']);
      del.onclick = ev => {
        ev.stopPropagation();
        if (!confirm(`Delete "${tpl.name}"?`)) return;
        Templates.remove(tpl.id);
        render();
      };
      box.appendChild(del);
    }
    return box;
  }

  function render() {
    if (!drawer) return;
    drawer.innerHTML = '';

    drawer.appendChild(el('div', { class: 'menu-head' }, ['Templates']));

    const saveBtn = el('button', { class: 'small' }, ['+ Save current as template']);
    saveBtn.onclick = async () => {
      const name = prompt('Template name?', 'My Template');
      if (!name) return;
      const c = getCurrentCanvas();
      const tpl = {
        name,
        tags: [],
        w: c.getWidth(),
        h: c.getHeight(),
        thumbnail: Templates.makeThumbnail(c, 300),
        canvasJSON: c.toJSON()
      };
      Templates.upsert(tpl);
      render();
    };
    drawer.appendChild(el('div', { class: 'row' }, [saveBtn]));

    // Built-in section
    if (Templates.builtins.length) {
      drawer.appendChild(el('h3', {}, ['Built-in']));
      const grid = el('div', { class: 'tpl-grid' }, []);
      Templates.builtins.forEach(t => grid.appendChild(card(t)));
      drawer.appendChild(grid);
    }

    // User section
    drawer.appendChild(el('h3', {}, ['My templates']));
    if (!Templates.users.length) {
      drawer.appendChild(el('div', { class: 'hint' }, ['No saved templates yet. Save current canvas above.']));
    } else {
      const grid = el('div', { class: 'tpl-grid' }, []);
      Templates.users.forEach(t => grid.appendChild(card(t)));
      drawer.appendChild(grid);
    }
  }

  function init(drawerEl, opts) {
    drawer = drawerEl;
    onLoadTemplate = opts.onLoad;
    getCurrentCanvas = opts.getCanvas;
  }

  return { init, render };
})();
