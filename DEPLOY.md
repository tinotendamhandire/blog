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
other (a leaked admin secret shouldn't also let someone write files). Also
set `GITHUB_TOKEN` (a fine-grained PAT scoped to just this repo, Contents:
read/write — see `admin/README.md`) if you want the Publish button in
`/admin` to work; without it, Publish 501s but Save still works fine.

## 3. Build and start all three

```bash
./scripts/prepare-blog-context.sh   # regenerates .deploy-context/ from git HEAD
docker compose up -d --build
```

That script exports a clean copy of whatever's actually committed into
`.deploy-context/`, which is what the `blog` service builds from — not
this directory directly. That matters because `/admin` writes post files
straight into `src/content/notes/` here without committing them (see
`admin/README.md`); if `blog` built from the live checkout, any draft
sitting there uncommitted would go live the moment *anything* triggered a
rebuild. Run the script before every manual rebuild of `blog` — the
deploy workflow does this step automatically, this is only for doing it
by hand.

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

## 5. CI: auto-deploy on push to main

`.github/workflows/build.yml` runs `npm run build` on every push and PR,
on GitHub's own runners — pure validation, never touches the box.
`.github/workflows/deploy.yml` runs only on a push to `main`, on a
**self-hosted** runner registered on this box, and does exactly the three
commands from step 3 above — `git pull`, regenerate `.deploy-context/`,
`docker compose up -d --build` — against `/opt/tools/blog` specifically
(not the runner's own throwaway checkout — that's why it skips
`actions/checkout`).

Deploy is deliberately scoped to `push` on `main`, never `pull_request` —
a self-hosted runner triggered by PRs would let anyone who can open one
run code on this box. Pushing to `main` already requires write access to
the repo, so that's the only thing that can trigger it.

**Register the runner once:**

1. GitHub repo → **Settings → Actions → Runners → New self-hosted
   runner**, choose Linux/x64, follow the download + `./config.sh`
   commands it shows you (the token in that command is single-use and
   time-limited, so run it live rather than saving it).
2. When `config.sh` asks for labels, add `blog-box` (matches
   `runs-on: [self-hosted, blog-box]` in the workflow) — this avoids the
   `main` branch accidentally deploying to some *other* self-hosted runner
   if you ever register one elsewhere.
3. Install it as a persistent service so it survives reboots, and make
   sure it runs as a user in the `docker` group (whatever user you
   normally run `docker compose` as):
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

After that, pushing to `main` — including whatever `/admin`'s **Publish**
button pushes directly — rebuilds and restarts all three containers
automatically. Two safety properties worth knowing:

- If `npm run build` would fail, `docker compose up -d --build` fails at
  the image-build step too (the Dockerfile runs the same build) — it
  never reaches `up`, so the **currently running containers are left
  alone**. A broken push doesn't take the site down, it just fails to
  deploy.
- If you've drafted a post via `/admin` on the box without committing it
  yet, and then push an unrelated change from elsewhere, `git pull
  --ff-only` can refuse with "commit your changes or stash them" if that
  same file's involved. That's intentional friction, not a bug — commit
  or stash the box's local changes before pushing something else into the
  same file.
- `.deploy-context/` (step 3) is what actually closes the loop here: an
  earlier version of this pipeline built `blog` straight from this
  directory, which meant an uncommitted `/admin` draft could go live the
  moment *any* unrelated push triggered a rebuild — `docker build`'s
  `COPY . .` doesn't know or care what git has or hasn't committed. Now
  `blog` only ever builds from a fresh `git archive HEAD` export, so a
  post genuinely has to be committed and pushed to be reachable.

Draft posts (`draft: true`) never make it into `dist/` in the first place,
so there's no risk of a half-written post going live from any of this.
