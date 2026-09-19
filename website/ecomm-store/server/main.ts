import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname } from 'node:path';
import { buildSiteMetaTags, injectSiteMeta } from '@duncit/brand/site-meta';

import { PORT } from './config';
import { escapeXml, robotsTxt, sitemapXml } from './crawl';
import { distFile, indexHtml, sendBody, sendStatic } from './files';
import { headFor } from './pages';
import { jsonLdTag } from './structured';

/**
 * ecomm.duncit.com's HTML server. It serves the built storefront and, for the
 * pages a crawler or a link preview reads — home, a product, a category, a
 * collection, a pet, a brand, a page — writes that page's own title,
 * description, social card, JSON-LD and favicon into the head before the HTML
 * leaves. A crawler never runs the SPA's JavaScript, so without this every
 * shared link would look the same.
 */
const HTML_TYPE = 'text/html; charset=utf-8';
const NO_CACHE = 'no-cache';

const ICON_TYPES: Record<string, string> = { png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon' };

/** `<link rel="icon">` for the store's favicon; '' when it has none. */
function faviconTag(url: string): string {
  if (!url) return '';
  const path = url.split(/[?#]/)[0] ?? '';
  const type = ICON_TYPES[extname(path).slice(1).toLowerCase()] ?? '';
  const typeAttr = type ? ` type="${type}"` : '';
  return `<link rel="icon" href="${escapeXml(url)}"${typeAttr}>`;
}

/** The SPA shell with this path's head written in; the plain shell if the API cannot say. */
async function renderPage(path: string): Promise<string> {
  const html = indexHtml();
  try {
    const head = await headFor(path);
    if (!head) return html;
    const tags = [buildSiteMetaTags(head.meta), ...head.structured.map(jsonLdTag), faviconTag(head.favicon)].filter(Boolean).join('\n    ');
    return injectSiteMeta(html, tags);
  } catch {
    return html;
  }
}

function pathOf(req: IncomingMessage): string {
  const raw = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = pathOf(req);
  if (path === '/healthz') return sendBody(req, res, 'ok', 'text/plain; charset=utf-8', 'no-store');
  if (path === '/robots.txt') return sendBody(req, res, robotsTxt(), 'text/plain; charset=utf-8', 'public, max-age=3600');
  if (path === '/sitemap.xml') return sendBody(req, res, await sitemapXml(), 'application/xml; charset=utf-8', 'public, max-age=3600');
  const file = path === '/' || path === '/index.html' ? null : distFile(path);
  if (file) return sendStatic(req, res, file, path);
  if (extname(path)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end();
    return;
  }
  sendBody(req, res, await renderPage(path), HTML_TYPE, NO_CACHE);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  handle(req, res).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : 'unknown';
    process.stderr.write(`${['request-failed', req.url ?? '', reason].join(' ')}\n`);
    if (res.headersSent) res.end();
    else sendBody(req, res, indexHtml(), HTML_TYPE, NO_CACHE);
  });
});

server.listen(PORT, () => {
  process.stdout.write(`${['ecomm-store-html', 'port', PORT].join(' ')}\n`);
});
