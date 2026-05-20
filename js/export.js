// Export canvas as PNG / WebP / SVG / JSON.
const Exporter = (() => {
  function download(blob, name) {
    const url = blob instanceof Blob ? URL.createObjectURL(blob) : blob;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (blob instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function raster(canvas, fmt, name) {
    const url = canvas.toDataURL({
      format: fmt === 'webp' ? 'webp' : 'png',
      multiplier: 1,
      quality: fmt === 'webp' ? 0.92 : 1
    });
    download(url, `${name}.${fmt}`);
  }

  function svg(canvas, name) {
    const data = canvas.toSVG();
    const blob = new Blob([data], { type: 'image/svg+xml' });
    download(blob, `${name}.svg`);
  }

  function json(canvas, name) {
    const data = JSON.stringify(canvas.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    download(blob, `${name}.json`);
  }

  return {
    run(canvas, fmt, name = 'design') {
      const safe = (name || 'design').replace(/[^\w-]+/g, '_');
      if (fmt === 'svg') return svg(canvas, safe);
      if (fmt === 'json') return json(canvas, safe);
      return raster(canvas, fmt, safe);
    }
  };
})();
