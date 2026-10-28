import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

type FilesModule = typeof import('../../html/files');

let dist: string;
let files: FilesModule;

/** A built dist folder in a temp directory, and the files module reading it as its DIST_DIR. */
beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'lite-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'assets', 'app-3f2a.js'), 'console.log("lite");'.repeat(20));
  writeFileSync(join(dist, 'assets', 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  writeFileSync(join(dist, 'sw.js'), 'self.addEventListener("fetch", () => {});');
  writeFileSync(join(dist, 'data.bin'), Buffer.from([1, 2, 3]));
  writeFileSync(join(dist, 'index.html'), '<html>web shell</html>');
  vi.stubEnv('LITE_DIST_DIR', dist);
  vi.resetModules();
  files = await import('../../html/files');
});

afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(dist, { recursive: true, force: true });
});

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

describe('distFile', () => {
  it('finds a built file under dist', () => {
    expect(files.DIST_DIR).toBe(dist);
    expect(files.distFile('/assets/app-3f2a.js')).toBe(join(dist, 'assets', 'app-3f2a.js'));
    expect(files.distFile('/sw.js')).toBe(join(dist, 'sw.js'));
  });

  it('never answers a path outside dist, a folder or a missing file', () => {
    expect(files.distFile('/../../etc/passwd')).toBeNull();
    expect(files.distFile('/assets/../../outside.txt')).toBeNull();
    expect(files.distFile('/assets')).toBeNull();
    expect(files.distFile('/')).toBeNull();
    expect(files.distFile('/missing.js')).toBeNull();
  });
});

describe('sendBody', () => {
  const send = (body: string | Buffer, type: string, status?: number): Handler => (req, res) => files.sendBody(req, res, body, type, 'no-cache', status);

  it('gzips text for a client that accepts it', async () => {
    const body = 'Sunday Jazz '.repeat(50);
    const res = await request(send(body, 'text/html; charset=utf-8')).get('/').set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.vary).toBe('Accept-Encoding');
    expect(Number(res.headers['content-length'])).toBeLessThan(Buffer.byteLength(body));
    expect(res.text).toBe(body);
  });

  it('sends text plainly to a client that does not accept gzip, with the given status', async () => {
    const res = await request(send('Not found', 'text/plain; charset=utf-8', 404)).get('/').set('Accept-Encoding', 'identity');
    expect(res.status).toBe(404);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['content-length']).toBe('9');
    expect(res.text).toBe('Not found');
  });

  it('never gzips binary types', async () => {
    const res = await request(send(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png')).get('/').set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['content-length']).toBe('4');
  });

  it('answers HEAD with the headers only', async () => {
    const res = await request(send('<html>shell</html>', 'text/html; charset=utf-8')).head('/').set('Accept-Encoding', 'identity');
    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBe('18');
    expect(res.text ?? '').toBe('');
  });
});

describe('sendStatic', () => {
  const serve = (urlPath: string): Handler => (req, res) => {
    const file = files.distFile(urlPath);
    if (!file) throw new Error(`missing fixture ${urlPath}`);
    files.sendStatic(req, res, file, urlPath);
  };

  it('caches hashed assets for a year and other files for an hour', async () => {
    const asset = await request(serve('/assets/app-3f2a.js')).get('/').set('Accept-Encoding', 'identity');
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(asset.headers['content-type']).toBe('text/javascript; charset=utf-8');

    const worker = await request(serve('/sw.js')).get('/').set('Accept-Encoding', 'identity');
    expect(worker.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('types files by extension, falling back to octet-stream', async () => {
    const png = await request(serve('/assets/logo.png')).get('/');
    expect(png.headers['content-type']).toBe('image/png');
    const unknown = await request(serve('/data.bin')).get('/');
    expect(unknown.headers['content-type']).toBe('application/octet-stream');
  });
});

describe('shellHtml', () => {
  it('reads a page shell once and serves it from memory afterwards', () => {
    expect(files.shellHtml('index.html')).toBe('<html>web shell</html>');
    writeFileSync(join(dist, 'index.html'), '<html>rebuilt</html>');
    expect(files.shellHtml('index.html')).toBe('<html>web shell</html>');
  });

  it('throws for a shell the build did not produce', () => {
    expect(() => files.shellHtml('portal.html')).toThrow();
  });
});
