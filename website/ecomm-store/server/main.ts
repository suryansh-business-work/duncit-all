import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname } from 'node:path';
import { buildSiteMetaTags, injectSiteMeta } from '@duncit/brand/site-meta';

import { PORT } from './config';
import { escapeXml, robotsTxt, sitemapXml } from './crawl';
import { distFile, indexHtml, sendBody, sendServiceWorker, sendStatic } from './files';
import { manifestJson } from './manifest';
import { isServerRenderedPath } from '../src/app/route-paths';
import { headFor, type PageHead } from './pages';
import { injectApp, renderStorePage } from './ssr';
import { jsonLdTag } from './structured';

/**
 * ecomm.duncit.com's HTML server. It serves the built storefront and, for the
 * pages a crawler or a link preview reads (home, a product, a category, a
 * collection, a pet, a brand, a page), writes that page's own title,
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

const ROOT_OPEN = '<div id="root">';

/**
 * The page's heading and summary inside #root, under the boot loader. A crawler
 * that does not run JavaScript reads them; React replaces them on mount with
 * the same title and text, drawn properly.
 */
function withRootText(html: string, head: PageHead): string {
  const body = head.summary || head.meta.description;
  const text = `<main><h1>${escapeXml(head.meta.title)}</h1><p>${escapeXml(body)}</p></main>`;
  // A function, so a `$` in the page's own words is never read as a replacement pattern.
  return html.replace(ROOT_OPEN, () => `${ROOT_OPEN}\n      ${text}`);
}

/**
 * The page with this path's head written in. A public page is rendered on the
 * server in full; the others, a gone page, or a render that fails or is too
 * slow get the shell with the heading and summary under the boot loader.
 * The plain shell (200) if the API cannot say.
 */
async function renderPage(path: string, url: string): Promise<{ html: string; status: number }> {
  const html = indexHtml();
  try {
    const head = await headFor(path);
    if (!head) return { html, status: 200 };
    const tags = [buildSiteMetaTags(head.meta), ...head.structured.map(jsonLdTag), faviconTag(head.favicon)].filter(Boolean).join('\n    ');
    const page = injectSiteMeta(html, tags);
    const status = head.notFound ? 404 : 200;
    const rendered = !head.notFound && isServerRenderedPath(path) ? await renderStorePage(url) : null;
    if (rendered) return { html: injectApp(page, rendered), status: Math.max(status, rendered.status) };
    return { html: withRootText(page, head), status };
  } catch {
    return { html, status: 200 };
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
  if (path === '/manifest.webmanifest') return sendBody(req, res, await manifestJson(), 'application/manifest+json', 'public, max-age=600');
  const worker = path === '/sw.js' ? distFile(path) : null;
  if (worker) return sendServiceWorker(req, res, worker);
  const file = path === '/' || path === '/index.html' ? null : distFile(path);
  if (file) return sendStatic(req, res, file, path);
  if (extname(path)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end();
    return;
  }
  const page = await renderPage(path, req.url ?? path);
  sendBody(req, res, page.html, HTML_TYPE, NO_CACHE, {}, page.status);
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
