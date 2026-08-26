# admin

A small git-backed post editor for the blog, served at
`blog.tinotenda.xyz/admin`. Standalone Node service (Hono), dockerized like
`file-host`, kept out of the Astro build for the same reason.

It is **not a CMS**: there's no database, and it doesn't serve the blog's
content at runtime. It reads and writes `.mdx` files directly in a
bind-mounted copy of the Astro project's `src/content/notes/` directory —
posts are still plain files in git, this just saves you hand-editing
frontmatter over SSH. New posts are always written as `.mdx` with a
`Media` import pre-inserted, so `<Media src="..." kind="video|audio" />`
always works in the body without extra setup.

**It deliberately does not run `git commit`/`git push` for you.** Writing
files automatically was already a stretch of "files in git, no CMS"; auto-
pushing on an unattended container crosses from convenience tool into an
agent that publishes to your repo on its own, which is a different (and
riskier) thing to hand a network-facing service. After editing, commit and
push the content directory yourself — or wire up your own small script to
do it if you decide you want that later.

- Auth: single shared secret (`ADMIN_SECRET`) as `Authorization: Bearer`,
  entered once in the browser UI and remembered in that browser's
  `localStorage`. Same pattern as `file-host`'s upload auth, deliberately
  not shared with it — a leaked admin secret shouldn't also be a file-host
  write secret.
- `GET /admin/api/posts` — list posts (slug, title, date, draft, tags).
- `GET /admin/api/posts/:slug` — fetch one post's frontmatter + body.
- `PUT /admin/api/posts/:slug` — create or overwrite a post.
- `DELETE /admin/api/posts/:slug` — remove a post's file.
- `POST /admin/api/upload` — proxies to `file-host`'s upload endpoint using
  server-side-only credentials, so the browser only ever needs
  `ADMIN_SECRET`.

## Run locally

```
cp .env.example .env    # set ADMIN_SECRET, point CONTENT_DIR at your checkout
npm install
npm run dev
```

Point `CONTENT_DIR` at `../src/content/notes` (relative to wherever you
actually run this from) to edit the real blog content directly during
local development.

## Deploy

See `../DEPLOY.md` for the full procedure (all three services, one
`docker-compose.yml`, the `cloudflared` ingress rules). `/admin` is
unlinked and carries `noindex,nofollow` like everything else on the site;
it isn't discoverable, it just also isn't secret-by-obscurity — the bearer
secret is the actual gate.
