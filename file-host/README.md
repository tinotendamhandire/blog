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

Build/run this alongside `admin` via the root `docker-compose.yml` (see
`../docker-compose.yml` and `../.env.example`) — either standalone
(`docker compose up -d --build` from the repo root) or by copying its
`services:` entry into the box's existing compose file next to
`tinotools-app`/`convertx`/`metube`/`crafty`. Both containers publish to
`127.0.0.1` only; nothing here is meant to be reachable except through the
tunnel or from sibling containers.

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

**Don't also add `blog.tinotenda.xyz` as a custom domain in the Cloudflare
Pages dashboard.** Pages' custom-domain flow wants to own that hostname's
DNS record (a CNAME to Pages), which collides with the DNS you already
have pointed at the tunnel — you only need one of them to own the
hostname, and it should be the tunnel, since it's the thing routing
`/files` and `/admin` too. Skip the custom-domain step in Pages entirely;
just grab the project's own `<project>.pages.dev` URL from its dashboard
after the first deploy and use *that* in the ingress rule above. DNS never
changes — the tunnel is the only thing that ever owns
`blog.tinotenda.xyz`.

Uploading is done from the admin UI at `/admin` (see `../admin`) — it
proxies to this service's upload endpoint using server-side-only
credentials, so the browser only ever needs the admin secret.
