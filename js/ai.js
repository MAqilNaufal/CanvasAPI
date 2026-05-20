// Frontend wrappers around CanvasAPI server.
// API_BASE auto-detects: same origin if served from canvas.* subdomain,
// otherwise hits localhost:7878 (dev).
const AI = (() => {
  function apiBase() {
    if (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:7878';
    }
    return '';  // same origin via nginx /api proxy
  }

  async function health() {
    try {
      const r = await fetch(apiBase() + '/api/health');
      return await r.json();
    } catch { return { ok: false }; }
  }

  async function bgRemove(dataUrl) {
    const r = await fetch(apiBase() + '/api/bg-remove?format=dataUrl', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dataUrl })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'bg-remove failed');
    return (await r.json()).dataUrl;
  }

  async function textToImage(prompt, aspect) {
    const r = await fetch(apiBase() + '/api/text-to-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, aspect })
    });
    if (!r.ok) throw new Error((await r.json()).error || 't2i failed');
    return (await r.json()).dataUrl;
  }

  return { health, bgRemove, textToImage, apiBase };
})();
