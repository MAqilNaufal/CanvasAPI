# Deploy — canvas.maqilnaufal.my.id

## 1. DNS

Add A record at your registrar:

```
canvas.maqilnaufal.my.id  →  43.133.145.74
```

Wait for propagation (`dig +short canvas.maqilnaufal.my.id`).

## 2. Backend (pm2)

```bash
cd /home/ubuntu/CanvasAPI/server
npm install
cp .env.example .env
# edit .env — set GEMINI_API_KEY=... (https://aistudio.google.com/apikey)
pm2 start ecosystem.config.cjs
pm2 save
```

Health check: `curl http://127.0.0.1:7878/api/health`

## 3. nginx + SSL

```bash
sudo cp /home/ubuntu/CanvasAPI/nginx/canvas.conf /etc/nginx/sites-available/canvas.maqilnaufal.my.id
sudo ln -s /etc/nginx/sites-available/canvas.maqilnaufal.my.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Cert + auto-https redirect
sudo certbot --nginx -d canvas.maqilnaufal.my.id
```

Certbot rewrites the file to add the :443 server block and the http→https redirect, matching the pattern of `growthcamber.maqilnaufal.my.id`.

## 4. Verify

- https://canvas.maqilnaufal.my.id loads the editor
- https://canvas.maqilnaufal.my.id/api/health returns `{"ok":true,"rembg":true,"gemini":true}`

## 5. Updates

```bash
cd /home/ubuntu/CanvasAPI
git pull
pm2 restart canvasapi-server   # only if server/ changed
```

Static files are served directly by nginx — no reload needed for frontend updates.
