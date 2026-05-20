// AI drawer: remove bg of selected image, generate image from prompt.
const AIUI = (() => {
  let drawer = null;
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

  function selectedImage() {
    const o = getCanvas().getActiveObject();
    return (o && o.type === 'image') ? o : null;
  }

  function imageToDataURL(img) {
    const el = img._element || img.getElement?.();
    if (!el) return null;
    const c = document.createElement('canvas');
    c.width = el.naturalWidth || el.width;
    c.height = el.naturalHeight || el.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(el, 0, 0);
    try { return c.toDataURL('image/png'); }
    catch { return null; }
  }

  function placeImageOnCanvas(dataUrl) {
    const canvas = getCanvas();
    fabric.Image.fromURL(dataUrl, img => {
      const max = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.7;
      const scale = Math.min(max / img.width, max / img.height, 1);
      img.set({
        left: canvas.getWidth() / 2 - (img.width * scale) / 2,
        top: canvas.getHeight() / 2 - (img.height * scale) / 2,
        scaleX: scale, scaleY: scale
      });
      canvas.add(img).setActiveObject(img);
    });
  }

  function replaceImage(oldImg, dataUrl) {
    const canvas = getCanvas();
    fabric.Image.fromURL(dataUrl, img => {
      img.set({
        left: oldImg.left,
        top: oldImg.top,
        scaleX: (oldImg.width * oldImg.scaleX) / img.width,
        scaleY: (oldImg.height * oldImg.scaleY) / img.height,
        angle: oldImg.angle,
        opacity: oldImg.opacity
      });
      canvas.remove(oldImg);
      canvas.add(img).setActiveObject(img);
    });
  }

  async function render() {
    if (!drawer) return;
    drawer.innerHTML = '';
    drawer.appendChild(el('div', { class: 'menu-head' }, ['AI ops']));

    const health = await AI.health();
    const hStat = el('div', { class: 'hint' }, [
      health.ok
        ? `Server up · rembg ${health.rembg ? '✓' : '✗'} · gemini ${health.gemini ? '✓' : '✗'}`
        : 'Server not reachable. Start with: cd server && npm start'
    ]);
    drawer.appendChild(hStat);

    // Bg-remove section
    drawer.appendChild(el('h3', {}, ['Remove background']));
    const bgStatus = el('div', { class: 'ai-status' }, ['']);
    const bgBtn = el('button', {}, ['Remove bg of selected image']);
    bgBtn.onclick = async () => {
      const sel = selectedImage();
      if (!sel) { bgStatus.textContent = 'Select an image first'; bgStatus.className = 'ai-status err'; return; }
      if (!health.rembg) { bgStatus.textContent = 'rembg not available on server'; bgStatus.className = 'ai-status err'; return; }
      const inUrl = imageToDataURL(sel);
      if (!inUrl) { bgStatus.textContent = 'Could not read image (CORS?)'; bgStatus.className = 'ai-status err'; return; }
      bgBtn.disabled = true;
      bgStatus.textContent = 'Removing bg…';
      bgStatus.className = 'ai-status';
      try {
        const out = await AI.bgRemove(inUrl);
        replaceImage(sel, out);
        bgStatus.textContent = '✓ Done';
        bgStatus.className = 'ai-status ok';
      } catch (e) {
        bgStatus.textContent = 'Error: ' + e.message;
        bgStatus.className = 'ai-status err';
      } finally {
        bgBtn.disabled = false;
      }
    };
    drawer.appendChild(bgBtn);
    drawer.appendChild(bgStatus);

    // Text-to-image section
    drawer.appendChild(el('h3', {}, ['Generate image']));
    const prompt = el('textarea', { rows: '3', placeholder: 'Modern Jakarta skyline at golden hour, photoreal, wide angle' }, []);
    drawer.appendChild(el('div', { class: 'row' }, [prompt]));

    const aspectSel = el('select', {}, []);
    ['1:1', '4:5', '16:9', '9:16', '3:2'].forEach(a => {
      aspectSel.appendChild(el('option', { value: a }, [a]));
    });
    drawer.appendChild(el('div', { class: 'row' }, [el('label', {}, ['Aspect']), aspectSel]));

    const t2iStatus = el('div', { class: 'ai-status' }, ['']);
    const genBtn = el('button', {}, ['Generate']);
    genBtn.onclick = async () => {
      if (!prompt.value.trim()) return;
      if (!health.gemini) { t2iStatus.textContent = 'GEMINI_API_KEY not set on server'; t2iStatus.className = 'ai-status err'; return; }
      genBtn.disabled = true;
      t2iStatus.textContent = 'Generating…';
      t2iStatus.className = 'ai-status';
      try {
        const dataUrl = await AI.textToImage(prompt.value.trim(), aspectSel.value);
        placeImageOnCanvas(dataUrl);
        t2iStatus.textContent = '✓ Placed on canvas';
        t2iStatus.className = 'ai-status ok';
      } catch (e) {
        t2iStatus.textContent = 'Error: ' + e.message;
        t2iStatus.className = 'ai-status err';
      } finally {
        genBtn.disabled = false;
      }
    };
    drawer.appendChild(genBtn);
    drawer.appendChild(t2iStatus);
  }

  function init(drawerEl, opts) {
    drawer = drawerEl;
    getCanvas = opts.getCanvas;
  }

  return { init, render };
})();
