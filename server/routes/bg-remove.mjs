import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const py = process.env.REMBG_PYTHON;
    const script = process.env.REMBG_SCRIPT;
    const model = process.env.REMBG_MODEL || 'u2netp';

    if (!py || !script) {
      return res.status(500).json({ error: 'REMBG_PYTHON / REMBG_SCRIPT not configured' });
    }

    let inputBuf;
    if (req.file) {
      inputBuf = req.file.buffer;
    } else if (req.body?.dataUrl) {
      const m = req.body.dataUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!m) return res.status(400).json({ error: 'invalid dataUrl' });
      inputBuf = Buffer.from(m[1], 'base64');
    } else {
      return res.status(400).json({ error: 'send multipart image or {dataUrl}' });
    }

    const id = crypto.randomBytes(8).toString('hex');
    const inPath = path.join(tmpdir(), `canvas-bg-${id}.in`);
    const outPath = path.join(tmpdir(), `canvas-bg-${id}.png`);
    await fs.writeFile(inPath, inputBuf);

    const child = spawn(py, [script, inPath, outPath, '--model', model]);
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('close', async code => {
      try {
        if (code !== 0) {
          await fs.unlink(inPath).catch(() => {});
          return res.status(500).json({ error: 'rembg failed', stderr });
        }
        const out = await fs.readFile(outPath);
        await Promise.all([fs.unlink(inPath).catch(() => {}), fs.unlink(outPath).catch(() => {})]);

        if (req.query.format === 'dataUrl' || req.body?.format === 'dataUrl') {
          res.json({ dataUrl: 'data:image/png;base64,' + out.toString('base64') });
        } else {
          res.set('Content-Type', 'image/png');
          res.send(out);
        }
      } catch (e) {
        next(e);
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
