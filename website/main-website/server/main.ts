/**
 * duncit.com's HTML server — Node, not nginx.
 *
 * It exists for the links that are a REDIRECT rather than a page. A short
 * link, duncit.com/aB3xY9Zq, used to be resolved by an inline script on the
 * home page: the apex answers every unknown path with index.html, so the code
 * landed there and JavaScript sent it on. That works for a person and not at
 * all for a crawler, which reads the head and leaves — so every pod, club and
 * profile anyone shared unfurled as the Duncit home page.
 *
 * Here the hop is a real 302 before any HTML is written, which the unfurlers
 * follow to the API resolver and its card (server/src/modules/crm/marketing/
 * shortLink.crawler.ts). Everything else is the built Astro site, served with
 * spa.conf's cache rules, plus a fresh meta block for the pages whose card is
 * only knowable per request.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { injectSiteMeta } from '@duncit/brand/site-meta';
import { SHORT_CODE_PATTERN, trimSlashes } from '../src/lib/short-link';
import { blogPostMeta } from './page-meta';
import { acceptsGzip, resolveDistFile, sendFile } from './static-files';

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);
const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/** Baked in by the Dockerfile from the same values the Astro bundle was built
 * with, so a staging image resolves against staging. */
const SERVER_URL = (process.env.SERVER_URL || 'https://server.duncit.com').replace(/\/+$/, '');
const SITE_URL = (process.env.SITE_URL || 'https://duncit.com').replace(/\/+$/, '');

/** The page that serves every blog post — the one route whose head cannot be
 * built, because which post it shows is in the query string. */
const BLOG_POST_PATH = '/blog/post';

const redirect = (res: ServerResponse, status: number, location: string): void => {
  res.writeHead(status, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
};

/**
 * A short code, handed to the API resolver as a redirect.
 *
 * The visitor's ORIGINAL referrer rides along as `dr`: after this hop the next
 * one would see duncit.com, and every click would be recorded as having come
 * from our own site instead of from Instagram, a post or a chat.
 */
function handleShortLink(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  search: string
): boolean {
  const code = trimSlashes(path);
  if (!SHORT_CODE_PATTERN.test(code)) return false;
  const params = new URLSearchParams(search);
  const referrer = req.headers.referer;
  if (referrer && !params.has('dr')) params.set('dr', referrer);
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  redirect(res, 302, `${SERVER_URL}/r/${code}${suffix}`);
  return true;
}

/**
 * `/policy?slug=…` is the address policies used to live at, kept so that every
 * link already printed in an email or a receipt still lands. It was a page
 * whose script rewrote the location, which meant it unfurled as "Redirecting…"
 * — a permanent move deserves to be answered as one.
 */
function handlePolicyAlias(res: ServerResponse, path: string, search: string): boolean {
  if (path !== '/policy') return false;
  const slug = new URLSearchParams(search).get('slug');
  redirect(res, 301, slug ? `/policy/${encodeURIComponent(slug)}` : '/policies');
  return true;
}

/** The description the page was BUILT with — already localized, and the right
 * thing to fall back on when a post carries no summary of its own. */
function builtDescription(html: string): string {
  const match = /<meta name="description" content="([^"]*)"/.exec(html);
  return match?.[1] ?? '';
}

function sendHtml(req: IncomingMessage, res: ServerResponse, html: string): void {
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

/** The blog post page, with the post's own card in place of the blog's. */
async function serveBlogPost(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  search: string
): Promise<void> {
  const html = readFileSync(filePath, 'utf8');
  const slug = new URLSearchParams(search).get('slug') ?? '';
  const pageUrl = `${SITE_URL}${BLOG_POST_PATH}${search}`;
  const block = await blogPostMeta(slug, pageUrl, builtDescription(html)).catch(() => null);
  sendHtml(req, res, block ? injectSiteMeta(html, block) : html);
}

/** Astro builds the 404 page as a file at the root, not a directory. Serving it
 * with a real 404 is a change from the nginx runner, which answered every
 * unknown path with the home page at 200 — the shape the short-link hop needed
 * back when it was a script on that page. */
function notFound(req: IncomingMessage, res: ServerResponse): void {
  const page = resolveDistFile(DIST_DIR, '/404.html');
  if (!page) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const html = readFileSync(page, 'utf8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(404);
  res.end(req.method === 'HEAD' ? undefined : html);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const url = new URL(req.url ?? '/', 'http://internal');
  const path = decodeURIComponent(url.pathname) || '/';

  if (handleShortLink(req, res, path, url.search)) return;
  if (handlePolicyAlias(res, path, url.search)) return;

  const filePath = resolveDistFile(DIST_DIR, path);
  if (!filePath) {
    notFound(req, res);
    return;
  }
  if (`/${trimSlashes(path)}` === BLOG_POST_PATH) {
    await serveBlogPost(req, res, filePath, url.search);
    return;
  }
  sendFile(req, res, filePath, path);
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(PORT, () => {
  console.log(`duncit.com html server listening on :${PORT}`);
});
