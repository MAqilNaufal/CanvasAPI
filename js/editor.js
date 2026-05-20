// Fabric canvas wiring + object factories.
const Editor = (() => {
  let canvas = null;

  function init() {
    canvas = new fabric.Canvas('c', {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true
    });
    return canvas;
  }

  function fit() {
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const wrap = document.querySelector('.canvas-wrap');
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';
  }

  function resize(w, h) {
    canvas.setWidth(w);
    canvas.setHeight(h);
    fit();
    canvas.renderAll();
  }

  function addText(s = 'Edit me') {
    const t = new fabric.Textbox(s, {
      left: canvas.getWidth() / 2 - 120,
      top: canvas.getHeight() / 2 - 24,
      width: 240,
      fontSize: 48,
      fontFamily: 'Inter, system-ui',
      fill: '#222'
    });
    canvas.add(t).setActiveObject(t);
  }

  function addRect() {
    const r = new fabric.Rect({
      left: 100, top: 100, width: 200, height: 140,
      fill: '#e94560'
    });
    canvas.add(r).setActiveObject(r);
  }

  function addCircle() {
    const c = new fabric.Circle({
      left: 100, top: 100, radius: 70, fill: '#0f3460'
    });
    canvas.add(c).setActiveObject(c);
  }

  function addLine() {
    const l = new fabric.Line([50, 50, 250, 50], {
      stroke: '#222', strokeWidth: 4
    });
    canvas.add(l).setActiveObject(l);
  }

  function addImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      fabric.Image.fromURL(e.target.result, img => {
        const max = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.7;
        const scale = Math.min(max / img.width, max / img.height, 1);
        img.set({
          left: canvas.getWidth() / 2 - (img.width * scale) / 2,
          top: canvas.getHeight() / 2 - (img.height * scale) / 2,
          scaleX: scale, scaleY: scale
        });
        canvas.add(img).setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
  }

  function deleteSelected() {
    const objs = canvas.getActiveObjects();
    objs.forEach(o => canvas.remove(o));
    canvas.discardActiveObject().renderAll();
  }

  function bringForward() {
    const o = canvas.getActiveObject();
    if (o) canvas.bringForward(o);
  }

  function sendBackward() {
    const o = canvas.getActiveObject();
    if (o) canvas.sendBackwards(o);
  }

  function clear() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
  }

  function loadJSON(json) {
    return new Promise(res => {
      History.suspend();
      canvas.loadFromJSON(json, () => {
        canvas.renderAll();
        History.resume();
        History.reset();
        res();
      });
    });
  }

  return {
    init, fit, resize, clear, loadJSON,
    addText, addRect, addCircle, addLine, addImageFromFile,
    deleteSelected, bringForward, sendBackward,
    get canvas() { return canvas; }
  };
})();
