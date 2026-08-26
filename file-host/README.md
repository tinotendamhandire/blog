# file-host

Drop-a-file-get-a-link service for `blog.tinotenda.xyz/files`. Standalone
Node service (Hono), not part of the Astro build — the blog stays a static
export; this is the one piece of the project that needs a real backend.

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

Same pattern as the other containers already on the box
(`tinotools-app`, `convertx`, `metube`, `crafty`): build the image, run it
as one more `docker-compose` service, mount a volume at `/app/data`.

```yaml
# add alongside the other services in the box's existing docker-compose.yml
services:
  file-host:
    build: ./file-host
    restart: unless-stopped
    environment:
      UPLOAD_SECRET: ${FILE_HOST_UPLOAD_SECRET}
      PUBLIC_BASE_URL: https://blog.tinotenda.xyz
      PORT: 3401
    ports:
      - "3401:3401" # or omit + join the tunnel's docker network directly
    volumes:
      - file-host-data:/app/data

volumes:
  file-host-data:
```

Since everything runs through `cloudflared`, routing is a `cloudflared`
ingress rule, not a Caddy/nginx vhost. The tunnel can point one path at
this container and fall through everything else to the Pages deployment's
own `*.pages.dev` URL — `service:` accepts an external origin, not just
`localhost` — so one hostname covers both the static blog and this backend
with no separate reverse proxy in front of either:

```yaml
# cloudflared config.yml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: blog.tinotenda.xyz
    path: ^/files/.*
    service: http://localhost:3401
  - hostname: blog.tinotenda.xyz
    path: ^/admin/.*
    service: http://localhost:3100 # the admin service, see ../admin
  - hostname: blog.tinotenda.xyz
    service: https://<your-pages-project>.pages.dev
  - service: http_status:404
```

Uploading is done from the admin UI at `/admin` (see `../admin`) — it
proxies to this service's upload endpoint using server-side-only
credentials, so the browser only ever needs the admin secret.
