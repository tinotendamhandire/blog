# file-host

Drop-a-file-get-a-link service for `blog.tinotenda.xyz/files`. Standalone
Node service (Hono), not part of the Astro build — the blog itself has no
server-side logic, just static files.

- `POST /files/upload` — `Authorization: Bearer <UPLOAD_SECRET>`, multipart
  field `file`. Returns `{ id, url }`.
- `GET /files/<id>` — serves the file, **no auth** — this is the one
  public route, and the entire point of the service.
- `GET /files` and `DELETE /files/<id>` — same bearer secret as upload.
  These exist for the admin file browser (see `../admin`), not for public
  use — there still isn't a route an anonymous visitor can hit to see
  what's been uploaded. Direct-link-only holds for everyone except
  whoever already has the upload secret, which was always true for
  writing; now it's also true for listing and deleting.
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
