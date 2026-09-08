import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * The static half of the site server — every cache rule here is the one
 * deploy/nginx/spa.conf applied before this process replaced it.
 */
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
  'text/javascript',
  'text/css',
  'application/json',
  'application/manifest+json',
  'image/svg+xml',
  'text/plain; charset=utf-8',
  'application/xml',
]);

/** Content-hashed Astro bundles never change under their name. */
const cacheControl = (urlPath: string): string =>
  urlPath.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'public, max-age=2592000';

export const acceptsGzip = (req: IncomingMessage): boolean =>
  (req.headers['accept-encoding'] ?? '').includes('gzip');

/** The dist file behind a URL path, or null when there is none. Astro builds
 * one directory per page, so `/about` is `about/index.html`. */
export function resolveDistFile(distDir: string, urlPath: string): string | null {
  const relative = normalize(urlPath).replaceAll('\\', '/');
  if (relative.includes('..') || relative.includes('\0')) return null;
  const root = resolve(distDir);
  const target = resolve(join(distDir, relative));
  if (target !== root && !target.startsWith(root + sep)) return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  if (extname(target)) return null;
  const indexFile = join(target, 'index.html');
  return existsSync(indexFile) ? indexFile : null;
}

export function sendFile(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  urlPath: string
): void {
  const contentType = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
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
