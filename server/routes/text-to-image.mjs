import express from 'express';

const router = express.Router();

const ASPECT_MAP = {
  '1:1':  { w: 1024, h: 1024 },
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720,  h: 1280 },
  '4:3':  { w: 1024, h: 768 },
  '3:4':  { w: 768,  h: 1024 },
  '3:2':  { w: 1200, h: 800 },
  '2:3':  { w: 800,  h: 1200 },
};

async function genPollinations(prompt, aspect) {
  const dims = ASPECT_MAP[aspect] || ASPECT_MAP['1:1'];
  const model = process.env.POLLINATIONS_MODEL || 'flux';
  const seed = Math.floor(Math.random() * 1e9);
  const params = new URLSearchParams({
    width:  String(dims.w),
    height: String(dims.h),
    model,
    nologo: 'true',
    seed:   String(seed),
    enhance: 'true',
  });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

  const r = await fetch(url, { method: 'GET' });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(`pollinations ${r.status}: ${t.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const mime = r.headers.get('content-type') || 'image/png';
  const buf = Buffer.from(await r.arrayBuffer());
  return { mime, b64: buf.toString('base64') };
}

async function genGemini(prompt, aspect) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('GEMINI_API_KEY not set');
    err.status = 500;
    throw err;
  }
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: aspect ? `${prompt}\n\nAspect ratio: ${aspect}` : prompt }],
    }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(`gemini ${r.status}: ${t.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const json = await r.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!img) {
    const err = new Error('no image in gemini response');
    err.status = 502;
    throw err;
  }
  return { mime: img.inlineData.mimeType, b64: img.inlineData.data };
}

router.post('/', async (req, res, next) => {
  try {
    const { prompt, aspect, provider } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt required' });
    }

    const preferred = (provider || process.env.T2I_PROVIDER || 'pollinations').toLowerCase();
    const order = preferred === 'gemini'
      ? ['gemini', 'pollinations']
      : ['pollinations', 'gemini'];

    const errors = [];
    for (const name of order) {
      try {
        const fn = name === 'gemini' ? genGemini : genPollinations;
        const { mime, b64 } = await fn(prompt, aspect);
        return res.json({
          dataUrl: `data:${mime};base64,${b64}`,
          provider: name,
        });
      } catch (e) {
        errors.push({ provider: name, message: e.message, status: e.status || 500 });
        if (name === 'gemini' && /API_KEY not set/i.test(e.message)) continue;
      }
    }

    return res.status(502).json({ error: 't2i providers failed', errors });
  } catch (e) {
    next(e);
  }
});

export default router;
