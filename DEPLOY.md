# Deploying blog.tinotenda.xyz

Three containers on the box, all reached through the existing
`cloudflared` tunnel — no Cloudflare Pages, no separate reverse proxy.
Pages' custom-domain flow and `cloudflared`'s tunnel ingress both want to
own the same hostname's DNS in incompatible ways, and a tunnel ingress
rule can't point at a public/Cloudflare-fronted origin like `*.pages.dev`
in the first place (that's the "DNS points to prohibited IP" error) — so
the static build is just served locally too, same as the other two.

| service   | what it is                                  | port (localhost) |
|-----------|----------------------------------------------|-------------------|
| `blog`    | static Astro build, served by nginx           | 8090              |
| `file-host` | upload/serve backend                        | 3401              |
| `admin`   | git-backed post editor UI                     | 3100              |

## 1. Get the code there

```bash
git clone https://github.com/tinotendamhandire/blog.git
cd blog
```

## 2. Set secrets

```bash
cp .env.example .env
openssl rand -hex 32   # run twice, paste each into .env
```
Fill in `UPLOAD_SECRET` and `ADMIN_SECRET` — keep them different from each
other (a leaked admin secret shouldn't also let someone write files).

## 3. Build and start all three

```bash
docker compose up -d --build
```

Same pattern as the other containers already on the box
(`tinotools-app`, `convertx`, `metube`, `crafty`) — this can run standalone
from this directory, or you can copy the three `services:` entries out of
`docker-compose.yml` into that box's existing compose file instead.
Everything binds to `127.0.0.1` only; nothing here is meant to be reachable
except through the tunnel.

Check all three came up clean:

```bash
docker compose ps
curl -sI http://localhost:8090/                 # expect 200, X-Robots-Tag header
curl -s  http://localhost:3401/files/nope        # expect 404, not a connection error
curl -sI http://localhost:3100/admin/            # expect 200
```

## 4. Wire up the tunnel

Add to your `cloudflared` `config.yml` — this hostname's DNS stays exactly
as it already is (a CNAME to the tunnel); everything below is routing
inside `cloudflared`, not a DNS change:

```yaml
ingress:
  - hostname: blog.tinotenda.xyz
    path: ^/files/.*
    service: http://localhost:3401
  - hostname: blog.tinotenda.xyz
    path: ^/admin/.*
    service: http://localhost:3100
  - hostname: blog.tinotenda.xyz
    service: http://localhost:8090
  - service: http_status:404
```

Then `cloudflared tunnel ingress validate` and restart the tunnel service.
Don't touch Cloudflare Pages at all for this project — it isn't part of
the deploy.

## Publishing a new post or a change

There's no CI rebuild-on-push here (that was the Pages part, and it's
gone). After editing via `/admin` or committing directly:

```bash
cd blog
git pull                        # if the change came from admin on a
                                 # different checkout, or your own machine
docker compose up -d --build blog
```

The `blog` image bakes `dist/` in at build time rather than mounting it
(so the container is a self-contained, reproducible artifact) — that
means a plain `restart` won't pick up new content, `--build` is required
every time.

Draft posts (`draft: true`) never make it into `dist/` in the first place,
so there's no risk of a half-written post going live from this step.
