/**
 * mWeb's HTML server — replaces the plain-nginx runner so every page goes out
 * with SERVER-SIDE meta tags: per-entity Open Graph/Twitter cards for shared
 * links (pods, clubs, profiles, posts, venues, products via the public
 * `linkPreview` query) and localized, branding-driven tags on every other
 * route. Crawlers never run the SPA's JavaScript; this is the only place the
 * right tags can come from.
 *
 * Static assets stream straight from dist with spa.conf's exact cache rules;
 * only the HTML shell is composed per request.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { resolvePageMeta, type PageMeta } from './page-meta';
import { buildMetaBlock, injectMetaBlock } from './render-html';
import { acceptsGzip, serveStatic } from './static-files';
import { getTranslator } from './i18n';

const PORT = Number.parseInt(process.env.PORT ?? '80', 10);
const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/** The built shell is immutable per image — read once, injected per request. */
const INDEX_HTML = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');

/** Behind nginx `Host $host` + X-Forwarded-Proto; https is the only public scheme. */
function requestOrigin(req: IncomingMessage): string {
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers.host ?? 'localhost';
  return `${proto}://${host}`;
}

function safePathname(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, 'http://internal');
    return decodeURIComponent(url.pathname) || '/';
  } catch {
    return '/';
  }
}

async function pageMeta(path: string): Promise<PageMeta> {
  try {
    return await resolvePageMeta(path);
  } catch {
    // Meta resolution must never block the page; the fallback card is the
    // bundle-translated default with no branding fetch behind it.
    const { t } = await getTranslator();
    return {
      title: t('mweb.meta.appName'),
      description: t('mweb.meta.defaultDescription'),
      imageUrl: null,
      appName: t('mweb.meta.appName'),
      defaultImageUrl: null,
      themeColor: null,
      // Nothing was resolved, so the requested path is all there is to
      // point at — the renderer falls back to it.
      canonicalPath: null,
    };
  }
}

async function servePage(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  const meta = await pageMeta(path);
  const block = buildMetaBlock(meta, requestOrigin(req), path);
  const html = injectMetaBlock(INDEX_HTML, block);
  const gzip = acceptsGzip(req);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Vary', 'Accept-Encoding');
  if (gzip) res.setHeader('Content-Encoding', 'gzip');
  res.writeHead(200);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(gzip ? gzipSync(Buffer.from(html)) : html);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const path = safePathname(req.url ?? '/');
  if (serveStatic(req, res, DIST_DIR, path)) return;
  await servePage(req, res, path);
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(PORT, () => {
  console.log(`mweb html server listening on :${PORT}`);
});
