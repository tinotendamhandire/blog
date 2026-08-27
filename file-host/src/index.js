// Drop-a-file-get-a-link host for blog.tinotenda.xyz/files.
// No *public* directory listing exists — GET /files/<id> is the only way
// an anonymous visitor can reach an upload, and <id> is an unguessable
// nanoid, not sequential or content-derived. GET /files (list) and
// DELETE /files/<id> exist too, but both require the same bearer secret
// as uploading — they're for the admin file browser, not public browsing.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { customAlphabet } from 'nanoid';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = Number(process.env.PORT || 3000);
const UPLOAD_SECRET = process.env.UPLOAD_SECRET;
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 200 * 1024 * 1024);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL; // e.g. https://blog.tinotenda.xyz

if (!UPLOAD_SECRET) {
  console.error('UPLOAD_SECRET env var is required — refusing to start.');
  process.exit(1);
}

await mkdir(DATA_DIR, { recursive: true });

// Unguessable ids: no sequential counter, no hash of file contents.
const genId = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  12,
);

function requireAuth(c) {
  return (c.req.header('authorization') || '') === `Bearer ${UPLOAD_SECRET}`;
}

const app = new Hono();

app.post('/files/upload', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);

  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) {
    return c.text('Missing "file" field', 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return c.text('File too large', 413);
  }

  const id = genId();
  // extname() resets on the last path separator, so an embedded "/" in the
  // original filename can't smuggle a directory component into storedName.
  const ext = path.extname(file.name).slice(0, 20);
  const storedName = `${id}${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(DATA_DIR, storedName), buf);
  await writeFile(
    path.join(DATA_DIR, `${id}.json`),
    JSON.stringify({
      originalName: file.name,
      contentType: file.type || 'application/octet-stream',
      storedName,
      uploadedAt: new Date().toISOString(),
    }),
  );

  const base = PUBLIC_BASE_URL || new URL(c.req.url).origin;
  return c.json({ id, url: `${base}/files/${id}` });
});

// Authenticated listing for the admin file browser — same secret as
// upload, never reachable without it. Not the public no-listing route.
app.get('/files', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);

  const base = PUBLIC_BASE_URL || new URL(c.req.url).origin;
  const entries = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  const files = await Promise.all(
    entries.map(async (entry) => {
      const id = entry.slice(0, -'.json'.length);
      let meta;
      try {
        meta = JSON.parse(await readFile(path.join(DATA_DIR, entry), 'utf8'));
      } catch {
        return null;
      }
      let size = 0;
      try {
        size = (await stat(path.join(DATA_DIR, meta.storedName))).size;
      } catch {
        return null; // sidecar with no matching file — skip rather than lie
      }
      return {
        id,
        url: `${base}/files/${id}`,
        originalName: meta.originalName,
        contentType: meta.contentType,
        uploadedAt: meta.uploadedAt,
        size,
      };
    }),
  );
  const list = files.filter(Boolean).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return c.json(list);
});

app.delete('/files/:id', async (c) => {
  if (!requireAuth(c)) return c.text('Unauthorized', 401);
  const id = c.req.param('id');
  if (!/^[0-9a-zA-Z]{1,32}$/.test(id)) return c.text('Not found', 404);

  let meta;
  try {
    meta = JSON.parse(await readFile(path.join(DATA_DIR, `${id}.json`), 'utf8'));
  } catch {
    return c.text('Not found', 404);
  }

  await rm(path.join(DATA_DIR, meta.storedName), { force: true });
  await rm(path.join(DATA_DIR, `${id}.json`), { force: true });
  return c.json({ ok: true });
});

app.get('/files/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^[0-9a-zA-Z]{1,32}$/.test(id)) {
    return c.text('Not found', 404);
  }

  let meta;
  try {
    meta = JSON.parse(await readFile(path.join(DATA_DIR, `${id}.json`), 'utf8'));
  } catch {
    return c.text('Not found', 404);
  }

  const filePath = path.join(DATA_DIR, meta.storedName);
  let st;
  try {
    st = await stat(filePath);
  } catch {
    return c.text('Not found', 404);
  }

  c.header('Content-Type', meta.contentType);
  c.header('Content-Length', String(st.size));
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('X-Robots-Tag', 'noindex');
  c.header(
    'Content-Disposition',
    `inline; filename="${meta.originalName.replace(/"/g, '')}"`,
  );

  return c.body(Readable.toWeb(createReadStream(filePath)));
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`file-host listening on :${info.port}, data dir ${DATA_DIR}`);
});
