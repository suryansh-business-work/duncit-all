import { existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { env } from '../config/env';

/** The built pages sit beside this bundle: dist-server/index.mjs -> ../dist. */
export const DIST_DIR = env.distDir || join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

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

const TEXTUAL = /^(text\/|application\/(json|manifest)|image\/svg)/;
const root = resolve(DIST_DIR);

/** The dist file for a URL path, never anything outside dist. */
export function distFile(urlPath: string): string | null {
  const target = resolve(root, `.${urlPath}`);
  if (!target.startsWith(root + sep)) return null;
  return existsSync(target) && statSync(target).isFile() ? target : null;
}

const wantsGzip = (req: IncomingMessage): boolean => /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));

export function sendBody(req: IncomingMessage, res: ServerResponse, body: Buffer | string, type: string, cache: string, status = 200): void {
  const raw = typeof body === 'string' ? Buffer.from(body) : body;
  const gzip = TEXTUAL.test(type) && wantsGzip(req);
  const payload = gzip ? gzipSync(raw) : raw;
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': cache,
    'Content-Length': payload.length,
    Vary: 'Accept-Encoding',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : payload);
}

export function sendStatic(req: IncomingMessage, res: ServerResponse, file: string, urlPath: string): void {
  const type = TYPES.get(extname(file).slice(1).toLowerCase()) ?? 'application/octet-stream';
  const cache = urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  sendBody(req, res, readFileSync(file), type, cache);
}

const shells = new Map<string, string>();

/** A built page shell (index.html or portal.html), read once. */
export function shellHtml(name: 'index.html' | 'portal.html'): string {
  let html = shells.get(name);
  if (html === undefined) {
    html = readFileSync(resolve(root, name), 'utf8');
    shells.set(name, html);
  }
  return html;
}
