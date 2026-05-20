// Properties panel — renders editable fields per selection type.
const Props = (() => {
  let panel = null;
  let canvas = null;

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

  function row(label, input) {
    return el('div', { class: 'row' }, [
      el('label', {}, [label]),
      input
    ]);
  }

  function num(obj, prop, label, step = 1) {
    const i = el('input', { type: 'number', step, value: obj[prop] ?? 0 });
    i.addEventListener('input', () => {
      obj.set(prop, parseFloat(i.value) || 0);
      canvas.requestRenderAll();
    });
    i.addEventListener('change', () => canvas.fire('object:modified', { target: obj }));
    return row(label, i);
  }

  function color(obj, prop, label) {
    const cur = obj[prop] || '#000000';
    const i = el('input', { type: 'color', value: cur.startsWith('#') ? cur : '#000000' });
    i.addEventListener('input', () => {
      obj.set(prop, i.value);
      canvas.requestRenderAll();
    });
    i.addEventListener('change', () => canvas.fire('object:modified', { target: obj }));
    return row(label, i);
  }

  function text(obj, prop, label) {
    const i = el('textarea', {}, []);
    i.value = obj[prop] || '';
    i.addEventListener('input', () => {
      obj.set(prop, i.value);
      canvas.requestRenderAll();
    });
    i.addEventListener('change', () => canvas.fire('object:modified', { target: obj }));
    return row(label, i);
  }

  function group(title, ...rows) {
    return el('div', { class: 'group' }, [el('h3', {}, [title]), ...rows]);
  }

  function render() {
    panel.innerHTML = '';
    const o = canvas.getActiveObject();
    if (!o) {
      panel.appendChild(el('div', { class: 'empty' }, ['Select an object']));
      return;
    }

    panel.appendChild(group(o.type || 'object',
      num(o, 'left', 'X'),
      num(o, 'top', 'Y'),
      num(o, 'angle', 'Rotation', 1)
    ));

    if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
      panel.appendChild(group('Text',
        text(o, 'text', 'Content'),
        num(o, 'fontSize', 'Size'),
        color(o, 'fill', 'Color')
      ));
      const fontSel = el('select', {}, []);
      ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS'].forEach(f => {
        const opt = el('option', { value: f }, [f]);
        if ((o.fontFamily || '') === f) opt.selected = true;
        fontSel.appendChild(opt);
      });
      fontSel.addEventListener('change', () => {
        o.set('fontFamily', fontSel.value);
        canvas.requestRenderAll();
        canvas.fire('object:modified', { target: o });
      });
      panel.appendChild(group('Font', row('Family', fontSel)));
    } else if (o.type === 'rect' || o.type === 'circle' || o.type === 'line' || o.type === 'polygon') {
      panel.appendChild(group('Style',
        color(o, 'fill', 'Fill'),
        color(o, 'stroke', 'Stroke'),
        num(o, 'strokeWidth', 'Stroke W')
      ));
      if (o.type === 'rect') {
        panel.appendChild(group('Size', num(o, 'width', 'W'), num(o, 'height', 'H')));
      } else if (o.type === 'circle') {
        panel.appendChild(group('Size', num(o, 'radius', 'R')));
      }
    } else if (o.type === 'image') {
      panel.appendChild(group('Image',
        num(o, 'scaleX', 'Scale X', 0.01),
        num(o, 'scaleY', 'Scale Y', 0.01),
        num(o, 'opacity', 'Opacity', 0.05)
      ));
    }
  }

  return {
    init(p, c) {
      panel = p;
      canvas = c;
      c.on('selection:created', render);
      c.on('selection:updated', render);
      c.on('selection:cleared', render);
      c.on('object:modified', render);
    },
    refresh: render
  };
})();
