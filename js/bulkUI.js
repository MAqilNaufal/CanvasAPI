// Bulk drawer: CSV drop, column preview, naming pattern, render→ZIP.
const BulkUI = (() => {
  let drawer = null;
  let csvInput = null;
  let csvRows = [];
  let csvHeaders = [];
  let getCanvas = null;

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

  function parseCSV(file) {
    return new Promise((res, rej) => {
      if (typeof window.Papa === 'undefined') return rej(new Error('Papa Parse not loaded'));
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: results => {
          csvRows = results.data;
          csvHeaders = results.meta.fields || [];
          res();
        },
        error: rej
      });
    });
  }

  function render() {
    if (!drawer) return;
    drawer.innerHTML = '';
    drawer.appendChild(el('div', { class: 'menu-head' }, ['Bulk render from CSV']));

    // Instructions
    drawer.appendChild(el('div', { class: 'hint' }, [
      'Put {{column}} tokens in any text. Use IMG:{{url_col}} in a text layer to swap with an image.'
    ]));

    // CSV picker
    const pickBtn = el('button', { class: 'small' }, [csvRows.length ? `CSV: ${csvRows.length} rows` : 'Choose CSV file…']);
    pickBtn.onclick = () => csvInput.click();
    const clearBtn = el('button', { class: 'small danger' }, ['Clear']);
    clearBtn.onclick = () => { csvRows = []; csvHeaders = []; render(); };
    drawer.appendChild(el('div', { class: 'row' }, [pickBtn, clearBtn]));

    if (!csvRows.length) {
      drawer.appendChild(el('div', { class: 'hint' }, ['Drop or pick a CSV with header row. Each row becomes one design.']));
      return;
    }

    // Token coverage
    const canvas = getCanvas();
    const cjson = canvas.toJSON();
    const tokens = Bulk.detectTokensInCanvas(cjson);
    drawer.appendChild(el('h3', {}, ['Tokens in canvas']));
    if (!tokens.length) {
      drawer.appendChild(el('div', { class: 'hint' }, ['No {{tokens}} found. Add some to text first.']));
    } else {
      const tagWrap = el('div', { class: 'tag-wrap' }, []);
      tokens.forEach(t => {
        const has = csvHeaders.includes(t);
        tagWrap.appendChild(el('span', { class: 'tag ' + (has ? 'ok' : 'miss'), title: has ? 'Matched in CSV' : 'Missing column' }, ['{{' + t + '}}']));
      });
      drawer.appendChild(tagWrap);
    }

    // Available columns
    drawer.appendChild(el('h3', {}, ['CSV columns']));
    const colWrap = el('div', { class: 'tag-wrap' }, []);
    csvHeaders.forEach(h => colWrap.appendChild(el('span', { class: 'tag', title: 'Click to copy {{token}}', on: { click: () => copy('{{' + h + '}}') } }, [h])));
    drawer.appendChild(colWrap);

    // Preview row 1
    drawer.appendChild(el('h3', {}, ['Row 1 preview']));
    const tbl = el('table', { class: 'preview-table' }, []);
    const r1 = csvRows[0];
    Object.keys(r1).slice(0, 8).forEach(k => {
      tbl.appendChild(el('tr', {}, [
        el('td', { class: 'k' }, [k]),
        el('td', { class: 'v' }, [String(r1[k] ?? '').slice(0, 60)])
      ]));
    });
    drawer.appendChild(tbl);

    // Naming pattern + format
    drawer.appendChild(el('h3', {}, ['Output']));
    const pat = el('input', { type: 'text', value: localStorage.getItem('canvas:bulkPattern') || 'design-{{i}}', placeholder: 'design-{{i}}' });
    pat.oninput = () => localStorage.setItem('canvas:bulkPattern', pat.value);
    drawer.appendChild(el('div', { class: 'row' }, [el('label', {}, ['Filename']), pat]));

    const fmt = el('select', {}, []);
    ['png', 'webp', 'jpeg'].forEach(f => {
      const o = el('option', { value: f }, [f.toUpperCase()]);
      if (f === (localStorage.getItem('canvas:bulkFmt') || 'png')) o.selected = true;
      fmt.appendChild(o);
    });
    fmt.onchange = () => localStorage.setItem('canvas:bulkFmt', fmt.value);
    drawer.appendChild(el('div', { class: 'row' }, [el('label', {}, ['Format']), fmt]));

    // Render
    const status = el('div', { class: 'bulk-status' }, ['']);
    const renderBtn = el('button', {}, [`Render ${csvRows.length} designs → ZIP`]);
    renderBtn.onclick = async () => {
      const c = getCanvas();
      const cj = c.toJSON();
      renderBtn.disabled = true;
      try {
        const blob = await Bulk.renderAll({
          canvasJSON: cj,
          w: c.getWidth(),
          h: c.getHeight(),
          rows: csvRows,
          format: fmt.value,
          pattern: pat.value,
          onProgress: (n, total) => { status.textContent = `Rendering ${n} / ${total}…`; }
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.download = `bulk-${stamp}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        status.textContent = `✓ Done — ${csvRows.length} designs`;
        status.className = 'bulk-status ok';
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
        status.className = 'bulk-status err';
      } finally {
        renderBtn.disabled = false;
      }
    };
    drawer.appendChild(renderBtn);
    drawer.appendChild(status);
  }

  function copy(txt) {
    navigator.clipboard?.writeText(txt);
  }

  function init(drawerEl, csvInputEl, opts) {
    drawer = drawerEl;
    csvInput = csvInputEl;
    getCanvas = opts.getCanvas;
    csvInput.onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        await parseCSV(f);
        render();
      } catch (err) {
        alert('CSV parse failed: ' + err.message);
      }
      e.target.value = '';
    };
  }

  return { init, render };
})();
