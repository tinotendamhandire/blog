# blog.tinotenda.xyz — architecture prompt

Paste this into a new conversation to bootstrap the project. Paste
`STYLE-GUIDE-PROMPT.md` alongside it — that one covers visual identity, this
one covers structure and the three specific features requested: invisible
posts, a reading-comfort theme, and a simple integrated file host.

---

## Prompt

Scaffold a new Astro + Svelte project for a personal blog at
`blog.tinotenda.xyz`, a sibling project to `tools.tinotenda.xyz` (tinotools).
Apply the tinotools visual identity (see the style guide) as the default
look, but this project has its own structural rules below — follow those
over general best practice where they conflict, they're intentional.
you should be able to upload files to be their own blogposts of course and there should be ability to play media in browser in blogposts
### Stack

- **Astro**, `output: "static"`, deployed the same way as tinotools
  (Cloudflare Pages — static export, no server runtime for the blog itself).
- **Content Collections** for posts — type-checked frontmatter, markdown/MDX
  in `src/content/notes/`.
- **Svelte** for the small interactive islands only: the theme toggle(s) and
  the file-upload widget. Everything else ships zero JS.
- No CMS, no database for post content — files in git, same as everything
  else in this ecosystem.

### Governing principle: nothing here is discoverable

This is the load-bearing requirement — get this right before anything else.
Every post, and every uploaded file, is reachable **only** if you already
have the exact URL. There is no browsing path to any of it. Concretely:

- **No archive/index page.** The homepage does not list posts. There is no
  `/notes` (or `/posts`) listing route at all — only individual post pages
  exist as routes.
- **No sitemap.** Either omit `sitemap.xml` entirely, or generate one that's
  intentionally empty/chrome-only (never enumerate post URLs in it).
- **No RSS feed linked from anywhere.** If you want one for your own reader,
  it can exist at an unlisted path, but don't add an `<link rel="alternate">`
  auto-discovery tag — that defeats the point.
- **`robots.txt` disallows everything**: `Disallow: /`. Every post page also
  carries `<meta name="robots" content="noindex,nofollow">` individually, in
  case something links to it out-of-band anyway.
- **No tag/category browse pages**, even though frontmatter can still carry
  tags for your own organization.
- A `draft: true` frontmatter flag excludes a post from the build output
  entirely (not just from a listing that doesn't exist anyway) — a real kill
  switch, not a visibility flag.
- This same "no directory, direct-link-only" rule applies to the file host
  below — it's one principle applied twice, not two separate decisions.

### Posts

- Content collection schema: `title`, `date`, `draft` (boolean, default
  `false`), optional `tags` (string array, for your own future filtering —
  not rendered as browsable). Slug from filename.
- Route shape: `/notes/<slug>` (matches the path convention the original
  tinotools maintainer used for their own writing — worth keeping for
  continuity even though the project's otherwise a clean break).
- No "next/previous post" navigation, no related-posts widget — those all
  imply a knowable sequence/index, which contradicts the invisibility rule.
  Each post is an island unto itself.

### Theming — two independent toggles, not one

tinotools' green/amber CRT toggle carries over as-is (see style guide) — but
add a **second, independent toggle**: CRT vs. **Reading mode**. CRT is
striking for chrome and short text; it is not what you want for paragraphs of
prose. Reading mode swaps the whole page (not just a content column) to a
comfort-first palette and stops pretending to be a terminal:

```
Reading — light:
  background   #f4f1ea      (warm paper, not pure white)
  foreground   #2a2620
  link         #4a5d3a      (muted, not neon)

Reading — dark:
  background   #1a1a18
  foreground   #e8e4d8
  link         #8fae72
```

- Typography: a humanist serif or plain readable sans for body text — not
  VT323. Normal type scale (no 118% root bump), line-height 1.6–1.75, prose
  measure capped around 65–75ch.
- CRT effects (scanlines, flicker, heading glow, blinking cursor) are fully
  off in reading mode — not toned down, off.
- Store the two toggle states separately in `localStorage`
  (`theme` = green/amber, `readingMode` = crt/reading) so they're
  independent axes, not one combined enum.
- Recommend defaulting individual **post pages** to reading mode even on
  first visit (override the site-wide default there) — chrome/any landing
  furniture can stay CRT since it's not something anyone's expected to read
  at length. Confirm this default with yourself once there's an actual post
  to look at; it's a judgment call, not a hard rule.

### File host — simple, separate, not part of the Astro build

A minimal drop-a-file-get-a-link tool, matching the "no directory" principle
(uploaded files aren't listed anywhere either — the returned URL is the only
way to reach one). Keep it **out of the Astro project** — it needs a real
backend (upload handling, storage), which conflicts with the blog staying a
static export. Build it as its own tiny service:

- Runs as its own container on the same box already hosting `tinotools-app`,
  `convertx`, `metube`, `crafty` — same pattern, one more compose service.
- `POST /upload` (protected by a shared secret / basic auth — only you can
  upload) stores the file and returns a URL keyed by a random unguessable id
  (e.g. `nanoid`), **not** a sequential or content-derived one.
- `GET /<id>` serves the file. No directory listing route exists, period.
- Storage: a local disk volume is simplest and consistent with how the other
  self-hosted services on that box work — reach for S3/R2 only if you
  specifically want off-box durability.
- Optional: expiry (delete after N days) and a max upload size, both easy to
  bolt on later — skip them for v1 if you just want it working.
- Reverse-proxied at `files.tinotenda.xyz`, or under `blog.tinotenda.xyz/files`
  if you'd rather not mint another subdomain.
- Build it by hand (a few dozen lines on Bun/Node/Deno — genuinely simple) or
  drop in an existing small self-hosted tool (PicoShare, Pingvin Share) if
  you'd rather not maintain the code yourself. Either is fine; "simple" was
  the requirement, not "bespoke."

### Open decisions to settle when this actually gets built

- Exact reading-mode font pick (a specific serif, not just "a serif").
- Whether an RSS feed exists at all, even unlisted.
- Hand-rolled file host vs. an existing OSS tool.
- Whether individual posts default to reading mode or inherit the site-wide
  toggle state (see note above).
