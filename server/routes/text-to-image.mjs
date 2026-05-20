import express from 'express';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const { prompt, aspect } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt required' });
    }

    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const body = {
      contents: [{
        role: 'user',
        parts: [{ text: aspect ? `${prompt}\n\nAspect ratio: ${aspect}` : prompt }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE']
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: 'gemini error', detail: t });
    }

    const json = await r.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
    if (!img) {
      return res.status(502).json({ error: 'no image in response', raw: json });
    }

    res.json({
      dataUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`
    });
  } catch (e) {
    next(e);
  }
});

export default router;
