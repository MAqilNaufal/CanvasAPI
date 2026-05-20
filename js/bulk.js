// Bulk CSV → renders. Token substitution: any {{column}} in text/textbox.
// Image swap: if textbox content matches IMG:{{column}}, replace with image
// loaded from that column's URL.
const Bulk = (() => {

  function substitute(canvasJSON, row) {
    const clone = JSON.parse(JSON.stringify(canvasJSON));
    const imageSwaps = [];

    function tokenSub(s) {
      return String(s).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => {
        return row[k] !== undefined ? String(row[k]) : '';
      });
    }

    for (let i = 0; i < (clone.objects || []).length; i++) {
      const o = clone.objects[i];
      if (!o) continue;
      if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
        if (typeof o.text === 'string') {
          // IMG: prefix swap to image
          const imgMatch = o.text.trim().match(/^IMG:\s*\{\{\s*([\w.-]+)\s*\}\}$/);
          if (imgMatch) {
            const col = imgMatch[1];
            const url = row[col];
            if (url) imageSwaps.push({ idx: i, url, placeholder: o });
            // keep placeholder for sizing reference
          } else {
            o.text = tokenSub(o.text);
          }
        }
      }
    }
    return { clone, imageSwaps };
  }

  function loadStaticCanvas(json, w, h) {
    return new Promise(res => {
      const el = document.createElement('canvas');
      el.width = w;
      el.height = h;
      const fc = new fabric.StaticCanvas(el, {
        backgroundColor: '#ffffff',
        width: w,
        height: h
      });
      fc.loadFromJSON(json, () => {
        fc.renderAll();
        res(fc);
      });
    });
  }

  function fabricImageFromURL(url, opts = {}) {
    return new Promise((res, rej) => {
      fabric.Image.fromURL(url, img => {
        if (!img) return rej(new Error('image load failed'));
        Object.assign(img, opts);
        res(img);
      }, { crossOrigin: 'anonymous' });
    });
  }

  async function applyImageSwaps(fc, imageSwaps) {
    for (const swap of imageSwaps) {
      const placeholder = fc.getObjects()[swap.idx];
      if (!placeholder) continue;
      try {
        const img = await fabricImageFromURL(swap.url);
        const bw = placeholder.width * (placeholder.scaleX || 1);
        const bh = placeholder.height * (placeholder.scaleY || 1);
        const scale = Math.min(bw / img.width, bh / img.height);
        img.set({
          left: placeholder.left,
          top: placeholder.top,
          scaleX: scale,
          scaleY: scale
        });
        fc.remove(placeholder);
        fc.add(img);
        fc.moveTo(img, swap.idx);
      } catch (e) {
        console.warn('image swap failed for row', e);
      }
    }
    fc.renderAll();
  }

  async function renderRow(canvasJSON, w, h, row, format = 'png') {
    const { clone, imageSwaps } = substitute(canvasJSON, row);
    const fc = await loadStaticCanvas(clone, w, h);
    if (imageSwaps.length) await applyImageSwaps(fc, imageSwaps);
    const dataUrl = fc.toDataURL({ format, multiplier: 1, quality: 0.92 });
    fc.dispose();
    return dataUrl;
  }

  function dataUrlToBlob(dataUrl) {
    const [head, body] = dataUrl.split(',');
    const mime = head.match(/data:(.*?);/)[1];
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function patternToName(pattern, row, idx) {
    let s = pattern || 'design-{{i}}';
    s = s.replace(/\{\{\s*i\s*\}\}/g, String(idx + 1).padStart(3, '0'));
    s = s.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => row[k] !== undefined ? String(row[k]) : '');
    return s.replace(/[^\w.-]+/g, '_').slice(0, 100) || `design-${idx + 1}`;
  }

  async function renderAll(opts) {
    const { canvasJSON, w, h, rows, format = 'png', pattern, onProgress } = opts;
    if (typeof window.JSZip === 'undefined') throw new Error('JSZip not loaded');
    const zip = new JSZip();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dataUrl = await renderRow(canvasJSON, w, h, row, format);
      const blob = dataUrlToBlob(dataUrl);
      const name = patternToName(pattern, row, i) + '.' + format;
      zip.file(name, blob);
      if (onProgress) onProgress(i + 1, rows.length);
    }
    const out = await zip.generateAsync({ type: 'blob' });
    return out;
  }

  function detectTokensInCanvas(canvasJSON) {
    const out = new Set();
    for (const o of (canvasJSON.objects || [])) {
      if ((o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') && typeof o.text === 'string') {
        const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
        let m;
        while ((m = re.exec(o.text)) !== null) out.add(m[1]);
      }
    }
    return [...out];
  }

  return {
    renderAll,
    renderRow,
    substitute,
    patternToName,
    detectTokensInCanvas
  };
})();
