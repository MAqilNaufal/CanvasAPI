# CanvasAPI — Content Helper Build Plan

Personal Canva alternative. Solo, no auth. Vanilla HTML + Fabric.js. Hosted nginx `canvas.maqilnaufal.my.id` on VPS.

Primary use: fill website content (Lippo property listings, Section 5 daily, portfolio assets).

## Architecture

```
CanvasAPI/
├── index.html          # main editor
├── templates.html      # template browser
├── bulk.html           # CSV → designs
├── brand.html          # brand kit manager
├── css/style.css
├── js/
│   ├── editor.js       # Fabric setup, canvas ops
│   ├── persist.js      # localStorage save/load
│   ├── brand.js        # brand kit apply
│   ├── templates.js    # template loaders
│   ├── pages.js        # multi-page state
│   ├── bulk.js         # CSV import + batch render
│   ├── ai.js           # backend calls
│   └── export.js       # PNG/WebP/SVG/PDF
├── templates/*.json    # template defs (Fabric JSON)
├── brand/kit.json      # active brand kit
├── server/             # Express :7878
│   ├── server.mjs
│   ├── routes/bg-remove.mjs   # shells out to rembg
│   ├── routes/text-to-image.mjs  # Gemini API
│   └── ecosystem.config.cjs
└── nginx/canvas.conf
```

No build step. `<script type=module>` from CDN where possible (Fabric, jsPDF, Papa Parse).

## Phases

| # | Phase | Output |
|---|-------|--------|
| 1 | Refactor + persistence | Modular files, localStorage projects, undo/redo |
| 2 | Brand kit | Color/font/logo panel; apply-to-selection |
| 3 | Templates | Browse, save-as-template, instantiate |
| 4 | Multi-page + PDF | Page tabs, jsPDF export, size presets |
| 5 | Bulk from CSV | CSV drop, column→layer mapping, ZIP export |
| 6 | AI backend | `/bg-remove` (rembg), `/text-to-image` (Gemini) |
| 7 | Deploy | nginx + pm2 |

## Out of scope (deferred)

- Real-time collab (Yjs/Liveblocks)
- Auth + multi-user
- Public templates marketplace
- Stripe / billing
- Mobile responsive editor (desktop-first)

## Decisions

- Storage: `localStorage` for designs (single user). Brand kit + templates as files in repo.
- Frame model: each design = `{pages: [{w,h,objects:[]}], brand: kitId}` serialized via `fabric.Canvas.toJSON()`.
- PDF: jsPDF + canvas raster fallback. Vector for text via SVG path.
- CSV: Papa Parse client-side, render via off-screen Fabric canvas, ZIP via JSZip.
- AI backend isolated process; editor calls `fetch('/api/...')` proxied through nginx.
