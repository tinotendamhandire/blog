# file-host

Drop-a-file-get-a-link service for `blog.tinotenda.xyz/files`. Standalone
Node service (Hono), not part of the Astro build — the blog itself has no
server-side logic, just static files.

- `POST /files/upload` — `Authorization: Bearer <UPLOAD_SECRET>`, multipart
  field `file`. Returns `{ id, url }`.
- `GET /files/<id>` — serves the file. No listing route exists anywhere.
- Storage: local disk under `DATA_DIR` (default `./data`), one file plus a
  `<id>.json` sidecar (original filename + content type) per upload.

## Run locally

```
cp .env.example .env   # set a real UPLOAD_SECRET
npm install
npm run dev
```

## Deploy

See `../DEPLOY.md` for the full procedure (all three services, one
`docker-compose.yml`, the `cloudflared` ingress rules). Uploading is done
from the admin UI at `/admin` (see `../admin`) — it proxies to this
service's upload endpoint using server-side-only credentials, so the
browser only ever needs the admin secret.
