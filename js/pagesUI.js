// Bottom bar: page thumbnails + add/duplicate buttons. Drag to reorder.
const PagesUI = (() => {
  let bar = null;
  let dragFrom = null;

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

  function pageThumb(p, idx, isActive) {
    const aspect = p.w / p.h;
    const box = el('div', {
      class: 'page-tab' + (isActive ? ' active' : ''),
      draggable: 'true',
      title: `${p.w}×${p.h}`
    }, []);
    const thumb = el('div', { class: 'page-thumb', style: `aspect-ratio:${aspect}` }, []);
    if (p.thumbnail) {
      thumb.style.backgroundImage = `url(${p.thumbnail})`;
      thumb.style.backgroundSize = 'cover';
    }
    box.appendChild(thumb);
    box.appendChild(el('span', { class: 'page-num' }, [String(idx + 1)]));

    box.onclick = () => Pages.setActive(idx);

    box.ondragstart = e => {
      dragFrom = idx;
      e.dataTransfer.effectAllowed = 'move';
    };
    box.ondragover = e => {
      e.preventDefault();
      box.classList.add('dragover');
    };
    box.ondragleave = () => box.classList.remove('dragover');
    box.ondrop = e => {
      e.preventDefault();
      box.classList.remove('dragover');
      if (dragFrom !== null && dragFrom !== idx) Pages.move(dragFrom, idx);
      dragFrom = null;
    };

    if (Pages.pages.length > 1) {
      const del = el('button', { class: 'del', title: 'Delete page' }, ['×']);
      del.onclick = ev => {
        ev.stopPropagation();
        if (!confirm(`Delete page ${idx + 1}?`)) return;
        Pages.remove(idx);
      };
      box.appendChild(del);
    }

    return box;
  }

  function render() {
    if (!bar) return;
    bar.innerHTML = '';
    const wrap = el('div', { class: 'page-tabs' }, []);
    Pages.pages.forEach((p, i) => wrap.appendChild(pageThumb(p, i, i === Pages.active)));

    const add = el('button', { class: 'page-add', title: 'Add page' }, ['+']);
    add.onclick = () => Pages.add();
    wrap.appendChild(add);

    const dup = el('button', { class: 'page-dup', title: 'Duplicate current' }, ['⧉']);
    dup.onclick = () => Pages.duplicate();
    wrap.appendChild(dup);

    bar.appendChild(wrap);
    bar.appendChild(el('div', { class: 'page-info' }, [
      `Page ${Pages.active + 1} of ${Pages.pages.length}`
    ]));
  }

  function init(barEl) {
    bar = barEl;
  }

  return { init, render };
})();
