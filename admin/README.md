# admin

A small git-backed post editor for the blog, served at
`blog.tinotenda.xyz/admin`. Standalone Node service (Hono), dockerized like
`file-host`, kept out of the Astro build for the same reason.

It is **not a CMS**: there's no database, and it doesn't serve the blog's
content at runtime. It reads and writes `.mdx` files directly in a
bind-mounted checkout of the Astro project — posts are still plain files
in git, this just saves you hand-editing frontmatter over SSH. New posts
are always written with a `Media` import pre-inserted, so
`<Media src="..." kind="video|audio" />` always works in the body without
extra setup.

**Save and Publish are two separate, deliberate actions.** Save only ever
writes the local file — it never touches git. Publish (`git add` → commit
→ push, scoped to that one post's file) is the one thing here with
standing write access to the GitHub repo, and it's behind an explicit
button, not something that happens as a side effect of editing. That
line is worth keeping even though it's a bit more friction than a single
"save and it's live" button — a network-facing service having *any*
credential that can push to your repo is a meaningfully bigger blast
radius than one that only writes local files, so it stays opt-in per post
rather than automatic.

- Auth: single shared secret (`ADMIN_SECRET`) as `Authorization: Bearer`,
  entered once in the browser UI and remembered in that browser's
  `localStorage`. Same pattern as `file-host`'s upload auth, deliberately
  not shared with it — a leaked admin secret shouldn't also be a file-host
  write secret.
- `GET /admin/api/posts` — list posts (slug, title, date, draft, tags).
- `GET /admin/api/posts/:slug` — fetch one post's frontmatter + body.
- `PUT /admin/api/posts/:slug` — create or overwrite a post (local file only).
- `DELETE /admin/api/posts/:slug` — remove a post's file (local only — not
  wired to Publish; a deletion needs a manual commit if it should stick).
- `POST /admin/api/publish/:slug` — `git add` + commit + push that post's
  file specifically, using `GITHUB_TOKEN`. No-ops harmlessly (`published:
  false`) if there's nothing new to commit.
- `POST /admin/api/upload` — proxies to `file-host`'s upload endpoint using
  server-side-only credentials, so the browser only ever needs
  `ADMIN_SECRET`.

## Setting up the publish token

Publish needs a GitHub token with push access, scoped as tightly as
possible — **not** your personal SSH key or a broad classic PAT:

1. GitHub → Settings → Developer settings → **Fine-grained tokens** →
   Generate new token.
2. Repository access → **Only select repositories** → this blog's repo.
3. Permissions → Repository permissions → **Contents: Read and write**.
   Nothing else needed.
4. Set an expiration you're comfortable rotating on, generate, and put the
   token in the box's root `.env` as `GITHUB_TOKEN` (see `../.env.example`).

Without `GITHUB_TOKEN` (and `REPO_DIR`) set, Publish returns `501` and
Save still works fine — the token is only required for the one endpoint.

## Run locally

```
cp .env.example .env    # set ADMIN_SECRET; REPO_DIR/CONTENT_DIR/GITHUB_TOKEN
                         # only needed if you want to test Publish locally
npm install
npm run dev
```

Point `REPO_DIR` at your actual checkout root and `CONTENT_DIR` at
`<that>/src/content/notes` to edit the real blog content during local
development.

## Deploy

See `../DEPLOY.md` for the full procedure (all three services, one
`docker-compose.yml`, the `cloudflared` ingress rules). `/admin` is
unlinked and carries `noindex,nofollow` like everything else on the site;
it isn't discoverable, it just also isn't secret-by-obscurity — the bearer
secret is the actual gate.
