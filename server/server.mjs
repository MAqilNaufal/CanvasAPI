import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bgRemove from './routes/bg-remove.mjs';
import textToImage from './routes/text-to-image.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lightweight .env loader (no dotenv dep)
function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv(path.join(__dirname, '.env'));

const PORT = parseInt(process.env.PORT || '7878', 10);
const BIND = process.env.BIND || '127.0.0.1';

const app = express();
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    rembg: !!process.env.REMBG_PYTHON && fs.existsSync(process.env.REMBG_PYTHON),
    gemini: !!process.env.GEMINI_API_KEY
  });
});

app.use('/api/bg-remove', bgRemove);
app.use('/api/text-to-image', textToImage);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'server error' });
});

app.listen(PORT, BIND, () => {
  console.log(`CanvasAPI server on http://${BIND}:${PORT}`);
});
