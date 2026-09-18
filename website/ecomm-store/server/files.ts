import { existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

import { DIST_DIR } from './config';

/** Content types for what a Vite build emits, keyed without the dot. */
const TYPES = new Map<string, string>([
  ['js', 'text/javascript; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['html', 'text/html; charset=utf-8'],
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['ico', 'image/x-icon'],
  ['woff2', 'font/woff2'],
  ['woff', 'font/woff'],
  ['json', 'application/json'],
  ['webmanifest', 'application/manifest+json'],
  ['txt', 'text/plain; charset=utf-8'],
  ['map', 'application/json'],
]);

/** Text is worth compressing; images and fonts already are. */
const TEXTUAL = /^(text\/|application\/(json|manifest)|image\/svg)/;

const root = resolve(DIST_DIR);

/** The dist file for a URL path — never anything outside dist. */
export function distFile(urlPath: string): string | null {
  const target = resolve(root, `.${urlPath}`);
  if (!target.startsWith(root + sep)) return null;
  return existsSync(target) && statSync(target).isFile() ? target : null;
}

export const wantsGzip = (req: IncomingMessage): boolean => /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));

/** Write a body with its type, compressing text when the client accepts gzip. */
export function sendBody(req: IncomingMessage, res: ServerResponse, body: Buffer | string, type: string, cache: string): void {
  const raw = typeof body === 'string' ? Buffer.from(body) : body;
  const gzip = TEXTUAL.test(type) && wantsGzip(req);
  const payload = gzip ? gzipSync(raw) : raw;
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': cache,
    'Content-Length': payload.length,
    Vary: 'Accept-Encoding',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : payload);
}

/** A built asset: hashed /assets/* never change under their name; everything else revalidates. */
export function sendStatic(req: IncomingMessage, res: ServerResponse, file: string, urlPath: string): void {
  const type = TYPES.get(extname(file).slice(1).toLowerCase()) ?? 'application/octet-stream';
  const cache = urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  sendBody(req, res, readFileSync(file), type, cache);
}

let shell: string | null = null;

/** The SPA's index.html, read once. */
export function indexHtml(): string {
  shell ??= readFileSync(resolve(root, 'index.html'), 'utf8');
  return shell;
}
