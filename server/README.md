# CanvasAPI server

Backend for AI ops the browser editor can't do alone.

- `POST /api/bg-remove` — multipart `image` or `{dataUrl}` → PNG with alpha
- `POST /api/text-to-image` — `{prompt, aspect?}` → `{dataUrl}` via Gemini
- `GET /api/health` — `{ok, rembg, gemini}`

## Setup

```bash
cd server
npm install
cp .env.example .env
# edit .env: GEMINI_API_KEY=...
npm start           # foreground :7878
# or
pm2 start ecosystem.config.cjs
```

`bg-remove` shells out to the rembg-equipped python from `lippo-content-automation/.venv` by default. Override via `REMBG_PYTHON` / `REMBG_SCRIPT` in `.env`.

Bound to `127.0.0.1` by default — front with nginx at `canvas.maqilnaufal.my.id` and proxy `/api/` to `:7878`.
