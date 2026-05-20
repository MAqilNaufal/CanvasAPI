// Brand kit drawer UI — kit selector, palette grid, font pickers, logo slots.
const BrandUI = (() => {
  const FONTS = [
    'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
    'Courier New', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Impact',
    'Bricolage Grotesque', 'Hanken Grotesk', 'Manrope'
  ];

  let drawer = null;
  let logoInput = null;

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

  function render() {
    if (!drawer) return;
    const kit = Brand.active();
    drawer.innerHTML = '';
    drawer.appendChild(el('div', { class: 'menu-head' }, ['Brand kit']));

    // Kit selector
    const sel = el('select', { class: 'kit-select' }, []);
    Brand.kits.forEach(k => {
      const o = el('option', { value: k.id }, [k.name + (k.builtin ? ' (built-in)' : '')]);
      if (k.id === kit.id) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => { Brand.setActive(sel.value); render(); };

    const newBtn = el('button', { class: 'small', title: 'New kit' }, ['+']);
    newBtn.onclick = () => {
      const name = prompt('Kit name?', 'My Brand');
      if (!name) return;
      const k = { name, colors: ['#000000'], fonts: { heading: 'Inter', body: 'Inter' }, logos: [] };
      Brand.upsert(k);
      Brand.setActive(k.id);
      render();
    };

    const delBtn = el('button', { class: 'small danger', title: 'Delete kit' }, ['×']);
    delBtn.onclick = () => {
      if (kit.builtin) return alert('Cannot delete built-in kit');
      if (!confirm(`Delete kit "${kit.name}"?`)) return;
      Brand.remove(kit.id);
      render();
    };
    delBtn.disabled = !!kit.builtin;

    drawer.appendChild(el('div', { class: 'row' }, [sel, newBtn, delBtn]));

    // Palette
    drawer.appendChild(el('h3', {}, ['Palette']));
    const pal = el('div', { class: 'palette' }, []);
    (kit.colors || []).forEach((c, i) => {
      const sw = el('button', { class: 'swatch', style: `background:${c}`, title: c }, []);
      sw.onclick = () => {
        const ok = Brand.applyColor(c);
        if (!ok) flash(sw, 'Select object first');
      };
      sw.oncontextmenu = ev => {
        ev.preventDefault();
        if (kit.builtin) return alert('Edit a copy: New kit first');
        if (!confirm('Remove this color?')) return;
        kit.colors.splice(i, 1);
        Brand.upsert(kit);
        render();
      };
      pal.appendChild(sw);
    });
    if (!kit.builtin) {
      const add = el('label', { class: 'swatch add', title: 'Add color' }, ['+']);
      const ci = el('input', { type: 'color', value: '#000000', style: 'display:none' });
      ci.onchange = () => {
        kit.colors = kit.colors || [];
        kit.colors.push(ci.value);
        Brand.upsert(kit);
        render();
      };
      add.appendChild(ci);
      add.onclick = () => ci.click();
      pal.appendChild(add);
    }
    drawer.appendChild(pal);

    // Fonts
    drawer.appendChild(el('h3', {}, ['Fonts']));
    ['heading', 'body'].forEach(role => {
      const cur = (kit.fonts || {})[role] || 'Inter';
      const fs = el('select', {}, []);
      FONTS.forEach(f => {
        const o = el('option', { value: f }, [f]);
        if (f === cur) o.selected = true;
        fs.appendChild(o);
      });
      fs.onchange = () => {
        if (!kit.builtin) {
          kit.fonts = kit.fonts || {};
          kit.fonts[role] = fs.value;
          Brand.upsert(kit);
        }
        Brand.applyFont(fs.value);
      };
      const lbl = el('label', {}, [role[0].toUpperCase() + role.slice(1)]);
      drawer.appendChild(el('div', { class: 'row' }, [lbl, fs]));
    });

    // Logos
    drawer.appendChild(el('h3', {}, ['Logos']));
    const lg = el('div', { class: 'logos' }, []);
    (kit.logos || []).forEach((logo, i) => {
      const slot = el('div', { class: 'logo-slot', title: logo.name }, []);
      const img = el('img', { src: logo.dataUrl });
      slot.appendChild(img);
      slot.onclick = () => Brand.placeLogo(logo.dataUrl);
      const del = el('button', { class: 'del' }, ['×']);
      del.onclick = ev => {
        ev.stopPropagation();
        if (kit.builtin) return alert('Edit a copy: New kit first');
        Brand.dropLogo(kit, i);
        render();
      };
      slot.appendChild(del);
      lg.appendChild(slot);
    });
    if (!kit.builtin) {
      const addSlot = el('button', { class: 'logo-slot add' }, ['+ Upload']);
      addSlot.onclick = () => logoInput.click();
      lg.appendChild(addSlot);
    }
    drawer.appendChild(lg);

    if (kit.builtin) {
      drawer.appendChild(el('div', { class: 'hint' }, ['Built-in kit is read-only. Create new kit to edit.']));
    }
  }

  function flash(node, msg) {
    const t = node.title;
    node.title = msg;
    node.classList.add('flash');
    setTimeout(() => { node.title = t; node.classList.remove('flash'); }, 800);
  }

  function init(drawerEl, fileInputEl) {
    drawer = drawerEl;
    logoInput = fileInputEl;
    logoInput.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        const kit = Brand.active();
        if (kit.builtin) {
          alert('Edit a copy: New kit first');
          return;
        }
        Brand.addLogo(kit, ev.target.result, f.name);
        render();
      };
      r.readAsDataURL(f);
      e.target.value = '';
    };
  }

  return { init, render };
})();
