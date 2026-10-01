import { Readable, pipeline } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { Router, type Request, type Response } from 'express';
import { logs } from '@observability/log';
import { driveContent, driveThumbnail } from './reel.drive';
import { MEDIA_TTL_SECONDS, verifyMediaToken } from './reel.media';

/**
 * Where Reel Studio's Drive footage is played from.
 *
 *   GET /reels/media/<token>       the file, range requests honoured
 *   GET /reels/thumbnail/<token>   Drive's preview frame for it
 *
 * No session: the player and Remotion's decoder fetch with plain GETs, so the
 * signed token in the path is the whole credential (see `reel.media.ts`). The
 * bytes are piped straight from Drive — never buffered here — which is what
 * lets a 300 MB clip be scrubbed without being copied anywhere first.
 *
 * `Range` goes to Drive as it came and Drive's `206` comes back as it was:
 * the decoder seeks by asking for byte ranges, and a route that answered 200
 * with the whole file would make every seek a full download.
 */

/**
 * What the decoder needs to read off a ranged response across origins. Only
 * local development relies on this line: in production nginx owns every CORS
 * header on this host, hides the ones sent from here, and exposes the same
 * three itself (deploy/nginx).
 */
const EXPOSED_HEADERS = 'Content-Range, Accept-Ranges, Content-Length';
/** The upstream headers that describe the bytes and are safe to repeat. */
const PASSED_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

const reject = (res: Response) => {
  res.status(404).type('text/plain').send('Not found\n');
};

const tokenOf = (req: Request): string => {
  const raw = req.params.token;
  return Array.isArray(raw) ? raw[0] : raw;
};

/**
 * Aborted the moment the client goes away. A decoder scrubbing through a clip
 * abandons range requests constantly, and one that leaves before Drive has
 * answered would otherwise leave that Drive download open with nobody to read it.
 */
function clientGone(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  return controller.signal;
}

/** Hand an upstream response to the client, body streamed. */
function pipeUpstream(upstream: globalThis.Response, res: Response, cacheControl: string): void {
  // The viewer left while Drive was answering: an unread body would hold its socket open.
  if (res.destroyed) {
    upstream.body?.cancel().catch(() => undefined);
    return;
  }
  // fetch has already decoded an encoded body, so its length no longer describes these bytes.
  const encoded = upstream.headers.has('content-encoding');
  for (const name of PASSED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value && !(encoded && name === 'content-length')) res.setHeader(name, value);
  }
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  // An open-ended range is most of a clip. Buffered, nginx would pull all of
  // it from Drive into temp files for a decoder that reads a few seconds and
  // seeks away; unbuffered, it reads only as fast as the viewer does.
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(upstream.status);
  if (!upstream.body) {
    res.end();
    return;
  }
  // pipeline, not pipe: it tears down BOTH ends when either fails or closes, so
  // a viewer who scrubs away stops the pull from Drive and a Drive error ends
  // the response instead of leaving it hanging.
  pipeline(Readable.fromWeb(upstream.body as WebReadableStream<Uint8Array>), res, () => undefined);
}

async function sendMedia(req: Request, res: Response): Promise<void> {
  const fileId = verifyMediaToken(tokenOf(req));
  if (!fileId) return reject(res);
  const upstream = await driveContent(fileId, req.get('range') ?? '', clientGone(res));
  if (!upstream.ok) {
    logs.server.warn('reel', 'media', { status: upstream.status, file_id: fileId });
    await upstream.body?.cancel();
    return reject(res);
  }
  // Private: the link is a credential, so no shared cache may keep the bytes.
  pipeUpstream(upstream, res, `private, max-age=${MEDIA_TTL_SECONDS}`);
}

async function sendThumbnail(req: Request, res: Response): Promise<void> {
  const fileId = verifyMediaToken(tokenOf(req));
  if (!fileId) return reject(res);
  const upstream = await driveThumbnail(fileId);
  if (!upstream) return reject(res);
  pipeUpstream(upstream, res, `private, max-age=${MEDIA_TTL_SECONDS}`);
}

/** Run a handler, turning a throw into a 502 unless the response already began. */
const guarded =
  (name: string, handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => {
    handler(req, res).catch((error) => {
      // A viewer who left aborts the upstream fetch on purpose; that is not a failure.
      if (res.destroyed) return;
      logs.server.error('reel', name, { error });
      if (res.headersSent) res.destroy();
      else res.status(502).type('text/plain').send('Google Drive could not be reached\n');
    });
  };

export function buildReelRouter(): Router {
  const router = Router();
  router.get('/media/:token', guarded('media', sendMedia));
  router.get('/thumbnail/:token', guarded('thumbnail', sendThumbnail));
  return router;
}
