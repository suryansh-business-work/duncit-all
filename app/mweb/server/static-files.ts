import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Mirrors deploy/nginx/spa.conf, which served these files before this server. */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.map': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const COMPRESSIBLE = new Set([
  'text/html; charset=utf-8',
  'text/javascript',
  'text/css',
  'application/json',
  'application/manifest+json',
  'image/svg+xml',
  'text/plain; charset=utf-8',
  'application/xml',
]);

const ONE_YEAR = 'public, max-age=31536000, immutable';
const ONE_MONTH = 'public, max-age=2592000';
const NO_CACHE = 'no-cache, no-store, must-revalidate';

function cacheControl(urlPath: string): string {
  if (urlPath === '/sw.js') return NO_CACHE;
  if (urlPath === '/manifest.webmanifest') return 'no-cache';
  if (urlPath.startsWith('/assets/')) return ONE_YEAR;
  if (urlPath.startsWith('/.well-known/')) return 'public, max-age=300';
  return ONE_MONTH;
}

export const acceptsGzip = (req: IncomingMessage): boolean =>
  (req.headers['accept-encoding'] ?? '').includes('gzip');

function sendFile(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  urlPath: string,
  contentType: string
): void {
  const gzip = COMPRESSIBLE.has(contentType) && acceptsGzip(req);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl(urlPath));
  res.setHeader('Vary', 'Accept-Encoding');
  if (gzip) res.setHeader('Content-Encoding', 'gzip');
  else res.setHeader('Content-Length', statSync(filePath).size);
  res.writeHead(200);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const source = createReadStream(filePath);
  const done = (error: NodeJS.ErrnoException | null): void => {
    if (error) res.destroy();
  };
  if (gzip) pipeline(source, createGzip(), res, done);
  else pipeline(source, res, done);
}

const notFound = (res: ServerResponse): void => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
};

/**
 * Serve `urlPath` from the dist directory when it is a real file. Returns
 * false when the request should fall through to the SPA page handler.
 *
 * Two deliberate non-fallthroughs, both inherited from spa.conf:
 *  - `/.well-known/*` — app-link association files must 404 as JSON, never as
 *    an HTML page (Android's verifier caches the failure).
 *  - any path with a file extension — a missing bundle is a 404, not index.html.
 */
export function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  distDir: string,
  urlPath: string
): boolean {
  const relative = normalize(urlPath).replaceAll('\\', '/');
  if (relative.includes('..') || relative.includes('\0')) {
    notFound(res);
    return true;
  }
  const root = resolve(distDir);
  const filePath = resolve(join(distDir, relative));
  // `/` resolves to the dist dir itself — that falls through to the SPA page.
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    notFound(res);
    return true;
  }
  const isFile = existsSync(filePath) && statSync(filePath).isFile();
  if (urlPath.startsWith('/.well-known/')) {
    if (isFile) sendFile(req, res, filePath, urlPath, 'application/json');
    else notFound(res);
    return true;
  }
  const extension = extname(filePath).toLowerCase();
  if (isFile && extension && extension !== '.html') {
    sendFile(req, res, filePath, urlPath, MIME_TYPES[extension] ?? 'application/octet-stream');
    return true;
  }
  if (!isFile && extension) {
    notFound(res);
    return true;
  }
  return false;
}
