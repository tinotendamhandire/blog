# Deploying blog.tinotenda.xyz

Three containers on the box, all reached through the existing
`cloudflared` tunnel — no Cloudflare Pages, no separate reverse proxy.
Pages' custom-domain flow and `cloudflared`'s tunnel ingress both want to
own the same hostname's DNS in incompatible ways, and a tunnel ingress
rule can't point at a public/Cloudflare-fronted origin like `*.pages.dev`
in the first place (that's the "DNS points to prohibited IP" error) — so
the static build is just served locally too, same as the other two.

`cloudflared` runs on a different machine on the LAN than these
containers, not on the docker host itself — so routing goes by the
docker host's LAN IP (`192.168.4.199` below; adjust if it ever changes —
a static DHCP reservation for that box avoids this silently breaking).

| service   | what it is                                  | port |
|-----------|----------------------------------------------|------|
| `blog`    | static Astro build, served by nginx           | 8090 |
| `file-host` | upload/serve backend                        | 3401 |
| `admin`   | git-backed post editor UI                     | 3100 |

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
`docker-compose.yml` into that box's existing compose file instead. Ports
publish on all interfaces, same as those — reachable on the LAN, not
exposed beyond it; the only actual public entry point is the tunnel.

Check all three came up clean, first locally on the box, then from
wherever `cloudflared` actually runs (the second is the check that
matters — a pass on localhost but a fail from the tunnel machine is
exactly the "works here, 502 through Cloudflare" symptom):

```bash
docker compose ps
curl -sI http://localhost:8090/                        # expect 200, X-Robots-Tag header
curl -s  http://localhost:3401/files/nope               # expect 404, not a connection error
curl -sI http://localhost:3100/admin/                   # expect 200

# from the cloudflared machine instead:
curl -sI http://192.168.4.199:8090/
curl -s  http://192.168.4.199:3401/files/nope
curl -sI http://192.168.4.199:3100/admin/
```

## 4. Wire up the tunnel

You're managing this tunnel through the Zero Trust dashboard's **Networks
→ Tunnels → your tunnel → Public Hostname** tab, not a local `config.yml`
— add three entries there, all under `blog.tinotenda.xyz`:

| Path        | Service                        |
|-------------|---------------------------------|
| `files/*`   | `http://192.168.4.199:3401`     |
| `admin/*`   | `http://192.168.4.199:3100`     | 
| *(blank — catchall)* | `http://192.168.4.199:8090` |

Put the catchall entry **last** — Public Hostname entries are matched in
order, so the two specific paths need to come before the blank one or it
swallows everything first. Use the docker host's actual LAN IP, not
`localhost` — `cloudflared` runs on a different machine here, so
`localhost` from its perspective is itself, not the docker host (this was
the whole cause of the earlier "works locally, 502 through Cloudflare"
symptom — the services were bound to `127.0.0.1` and unreachable from
another machine at all, regardless of what hostname was used to reach
them).

DNS for `blog.tinotenda.xyz` stays exactly as it already is — a CNAME to
the tunnel, untouched by any of this. Don't touch Cloudflare Pages at all
for this project either — it isn't part of the deploy.

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
