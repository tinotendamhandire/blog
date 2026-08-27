// Git-backed post editor + admin, for blog.tinotenda.xyz/admin. Writes
// directly into the Astro content collection directory (bind-mounted from
// the box's checkout of the blog repo) — posts are still files in git, this
// is just a convenience writer, not a CMS database. Save and Publish are
// deliberately separate actions: Save only ever touches the local file,
// Publish is the one thing that commits and pushes (see README for why
// that's not automatic).

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import matter from 'gray-matter';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const CONTENT_DIR = process.env.CONTENT_DIR || './content';
const PORT = Number(process.env.PORT || 3100);
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const FILE_HOST_URL = process.env.FILE_HOST_URL; // e.g. http://file-host:3000
const FILE_HOST_UPLOAD_SECRET = process.env.FILE_HOST_UPLOAD_SECRET;
const REPO_DIR = process.env.REPO_DIR; // e.g. /app/repo — whole repo, for Publish
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || 'blog-admin';
const GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || 'admin@blog.tinotenda.xyz';

if (!ADMIN_SECRET) {
  console.error('ADMIN_SECRET env var is required — refusing to start.');
  process.exit(1);
}

await mkdir(CONTENT_DIR, { recursive: true });

const MEDIA_IMPORT = "import Media from '../../components/Media.astro';\n\n";
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

function requireAuth(c) {
  return (c.req.header('authorization') || '') === `Bearer ${ADMIN_SECRET}`;
}

function stripMediaImport(content) {
  // \s* up front tolerates a blank line between frontmatter and the import
  // (the normal MDX style for hand-written posts) — without it, the strip
  // silently no-ops on any file that isn't admin's own no-gap output,
  // leaving the import sitting in the body and duplicating it on save.
  return content.replace(/^\s*import Media from ['"][^'"]*['"];\s*\n+/, '');
}

function formatDate(value) {
  // gray-matter parses an unquoted YAML date (2026-08-26) into a native
  // Date — String(date) then gives a full localized timestamp string
  // ("Wed Aug 26 2026 08:00:00 GMT+0800..."), which <input type="date">
  // silently rejects, loading blank and corrupting the date on next save.
  // Format explicitly instead; a value already stored as a plain string
  // (quoted in the frontmatter) passes through untouched.
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ? String(value) : '';
}

async function findPostFile(slug) {
  for (const ext of ['.mdx', '.md']) {
    try {
      await readFile(path.join(CONTENT_DIR, `${slug}${ext}`));
      return `${slug}${ext}`;
    } catch {}
  }
  return null;
}

function git(args) {
  return execFileSync('git', ['-C', REPO_DIR, ...args], { encoding: 'utf8' });
}

const app = new Hono();

app.get('/admin', (c) => c.redirect('/admin/'));

app.get('/admin/', async (c) => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  return c.html(html);
});

app.get('/admin/fonts/:file', async (c) => {
  const file = c.req.param('file');
  if (!/^[\w.-]+$/.test(file)) return c.text('Not found', 404);
  try {
    const buf = await readFile(new URL(`../public/fonts/${file}`, import.meta.url));
    c.header('Content-Type', file.endsWith('.woff2') ? 'font/woff2' : 'text/plain');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(buf);
  } catch {
    return c.text('Not found', 404);
  }
});

app.get('/admin/api/posts', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(CONTENT_DIR, file), 'utf8');
      const { data } = matter(raw);
      return {
        slug: file.replace(/\.(mdx|md)$/, ''),
        title: data.title || '(untitled)',
        date: formatDate(data.date),
        draft: !!data.draft,
        tags: data.tags || [],
      };
    }),
  );
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return c.json(posts);
});

app.get('/admin/api/posts/:slug', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.text('Bad slug', 400);
  const file = await findPostFile(slug);
  if (!file) return c.text('Not found', 404);
  const raw = await readFile(path.join(CONTENT_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  return c.json({
    slug,
    title: data.title || '',
    date: formatDate(data.date),
    draft: !!data.draft,
    tags: (data.tags || []).join(', '),
    body: stripMediaImport(content).trim(),
  });
});

app.put('/admin/api/posts/:slug', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.text('Bad slug', 400);

  const { title, date, draft, tags, body } = await c.req.json();
  if (!title || !date) return c.text('title and date are required', 400);

  const tagList = String(tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // Frontmatter must be the first bytes of the file for MDX to parse it as
  // such, so the import goes *into* the content matter.stringify appends
  // after the frontmatter block — not concatenated in front of the whole
  // thing (that produced `import ...; \n --- \n title: ... ` and broke MDX).
  const fileContents = matter.stringify(MEDIA_IMPORT + (body || ''), {
    title,
    date,
    draft: !!draft,
    ...(tagList.length ? { tags: tagList } : {}),
  });

  // Exactly one file per slug — drop a stale sibling under the other extension.
  const existing = await findPostFile(slug);
  if (existing && existing !== `${slug}.mdx`) {
    await rm(path.join(CONTENT_DIR, existing));
  }

  await writeFile(path.join(CONTENT_DIR, `${slug}.mdx`), fileContents);
  return c.json({ ok: true, slug });
});

app.delete('/admin/api/posts/:slug', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.text('Bad slug', 400);
  const file = await findPostFile(slug);
  if (!file) return c.text('Not found', 404);
  await rm(path.join(CONTENT_DIR, file));
  return c.json({ ok: true });
});

app.post('/admin/api/publish/:slug', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  if (!REPO_DIR || !GITHUB_TOKEN) {
    return c.text('Publish not configured (REPO_DIR/GITHUB_TOKEN missing)', 501);
  }
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.text('Bad slug', 400);
  const file = await findPostFile(slug);
  if (!file) return c.text('Not found', 404);

  // Scoped to this one post's file — publishing shouldn't sweep up some
  // other half-finished draft that happens to be sitting uncommitted too.
  const relPath = path.relative(REPO_DIR, path.join(CONTENT_DIR, file));

  try {
    git(['add', relPath]);
    const status = git(['status', '--porcelain', '--', relPath]);
    if (!status.trim()) {
      return c.json({ ok: true, published: false, message: 'nothing to publish — already up to date' });
    }
    git([
      '-c', `user.name=${GIT_AUTHOR_NAME}`,
      '-c', `user.email=${GIT_AUTHOR_EMAIL}`,
      'commit', '-m', `publish: ${slug}`, '--', relPath,
    ]);
    const authHeader = `Authorization: Basic ${Buffer.from(`x-access-token:${GITHUB_TOKEN}`).toString('base64')}`;
    git(['-c', `http.extraheader=${authHeader}`, 'push', 'origin', 'HEAD:main']);
    return c.json({ ok: true, published: true });
  } catch (err) {
    return c.text(`Publish failed: ${err.message}`, 500);
  }
});

app.post('/admin/api/upload', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  if (!FILE_HOST_URL || !FILE_HOST_UPLOAD_SECRET) {
    return c.text('File host not configured', 501);
  }

  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) return c.text('Missing "file" field', 400);

  const fd = new FormData();
  fd.append('file', file, file.name);
  const res = await fetch(`${FILE_HOST_URL}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${FILE_HOST_UPLOAD_SECRET}` },
    body: fd,
  });
  if (!res.ok) return c.text('Upload failed', 502);
  return c.json(await res.json());
});

app.get('/admin/api/files', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  if (!FILE_HOST_URL || !FILE_HOST_UPLOAD_SECRET) {
    return c.text('File host not configured', 501);
  }
  const res = await fetch(`${FILE_HOST_URL}/files`, {
    headers: { Authorization: `Bearer ${FILE_HOST_UPLOAD_SECRET}` },
  });
  if (!res.ok) return c.text('Listing failed', 502);
  return c.json(await res.json());
});

app.delete('/admin/api/files/:id', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  if (!FILE_HOST_URL || !FILE_HOST_UPLOAD_SECRET) {
    return c.text('File host not configured', 501);
  }
  const res = await fetch(`${FILE_HOST_URL}/files/${c.req.param('id')}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${FILE_HOST_UPLOAD_SECRET}` },
  });
  if (!res.ok) return c.text('Delete failed', 502);
  return c.json(await res.json());
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`admin listening on :${info.port}, content dir ${CONTENT_DIR}`);
});
