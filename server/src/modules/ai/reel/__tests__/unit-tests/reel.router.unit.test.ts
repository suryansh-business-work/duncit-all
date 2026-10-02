import { EventEmitter } from 'node:events';
import express, { type Request, type Response as ExpressResponse } from 'express';
import request from 'supertest';
import { logs } from '@observability/log';
import { driveContent, driveThumbnail } from '../../reel.drive';
import { verifyMediaToken } from '../../reel.media';
import { buildReelRouter } from '../../reel.router';

jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));
jest.mock('../../reel.drive', () => ({ driveContent: jest.fn(), driveThumbnail: jest.fn() }));
jest.mock('../../reel.media', () => ({ MEDIA_TTL_SECONDS: 21_600, verifyMediaToken: jest.fn() }));

const mockContent = driveContent as jest.Mock;
const mockThumbnail = driveThumbnail as jest.Mock;
const mockVerify = verifyMediaToken as jest.Mock;
const mockWarn = logs.server.warn as jest.Mock;
const mockError = logs.server.error as jest.Mock;

const app = express().use('/reels', buildReelRouter());

type Handler = (req: Request, res: ExpressResponse) => void;

/** The route's own handler, for the cases a real socket cannot be put into. */
function handlerOf(path: string): Handler {
  const layer = (buildReelRouter().stack as Array<{ route?: { path: string; stack: Array<{ handle: Handler }> } }>).find(
    (item) => item.route?.path === path
  );
  return layer!.route!.stack[0].handle;
}

/** A response that records what was done to it, with the two flags a socket would set. */
function fakeResponse(state: { destroyed?: boolean; headersSent?: boolean } = {}) {
  const res = Object.assign(new EventEmitter(), {
    destroyed: state.destroyed ?? false,
    headersSent: state.headersSent ?? false,
    status: jest.fn(),
    type: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn(),
  });
  res.status.mockReturnValue(res);
  res.type.mockReturnValue(res);
  return res;
}

const fakeRequest = (token: string | string[]) => ({ params: { token }, get: () => undefined }) as unknown as Request;

/** Let the handler's promise chain, and the catch behind it, run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mockVerify.mockImplementation((token: string) => (token === 'good' ? 'drive-file-1' : null));
});

describe('GET /reels/media/:token', () => {
  it('answers 404 to a forged or expired link without asking Drive', async () => {
    const res = await request(app).get('/reels/media/forged');
    expect(res.status).toBe(404);
    expect(res.text).toBe('Not found\n');
    expect(mockContent).not.toHaveBeenCalled();
  });

  it('answers 404 when Drive refuses the file, and drops the refusal body', async () => {
    const upstream = new Response('denied', { status: 403 });
    const cancel = jest.spyOn(upstream.body!, 'cancel');
    mockContent.mockResolvedValue(upstream);
    const res = await request(app).get('/reels/media/good');
    expect(res.status).toBe(404);
    expect(cancel).toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('reel', 'media', { status: 403, file_id: 'drive-file-1' });
  });

  it('answers 404 for a refusal that has no body to drop', async () => {
    mockContent.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await request(app).get('/reels/media/good');
    expect(res.status).toBe(404);
  });

  it('streams the range Drive answered with, as Drive answered it', async () => {
    mockContent.mockResolvedValue(
      new Response('0123456789', {
        status: 206,
        headers: {
          'content-type': 'video/mp4',
          'content-range': 'bytes 0-9/100',
          'accept-ranges': 'bytes',
          'x-goog-hash': 'crc32c=abc',
        },
      })
    );
    const res = await request(app).get('/reels/media/good').set('Range', 'bytes=0-9');
    expect(res.status).toBe(206);
    expect(res.body.toString()).toBe('0123456789');
    expect(res.headers).toMatchObject({
      'content-type': 'video/mp4',
      'content-range': 'bytes 0-9/100',
      'accept-ranges': 'bytes',
      'cache-control': 'private, max-age=21600',
      'access-control-expose-headers': 'Content-Range, Accept-Ranges, Content-Length',
      'x-accel-buffering': 'no',
    });
    // Only the headers that describe the bytes are repeated.
    expect(res.headers['x-goog-hash']).toBeUndefined();
    expect(mockContent).toHaveBeenCalledWith('drive-file-1', 'bytes=0-9', expect.any(AbortSignal));
  });

  it('asks Drive for the whole file when the viewer sent no range, and stops the pull when they leave', async () => {
    mockContent.mockResolvedValue(new Response('whole', { headers: { 'content-type': 'video/mp4' } }));
    await request(app).get('/reels/media/good');
    const [, range, signal] = mockContent.mock.calls[0];
    expect(range).toBe('');
    await settle();
    expect((signal as AbortSignal).aborted).toBe(true);
  });

  it('does not repeat the length of a body fetch has already decoded', async () => {
    const res = fakeResponse();
    mockContent.mockResolvedValue(
      new Response(null, { status: 200, headers: { 'content-encoding': 'gzip', 'content-length': '512', etag: '"v1"' } })
    );
    handlerOf('/media/:token')(fakeRequest(['good']), res as unknown as ExpressResponse);
    await settle();
    expect(res.setHeader).toHaveBeenCalledWith('etag', '"v1"');
    expect(res.setHeader).not.toHaveBeenCalledWith('content-length', expect.anything());
    // Nothing to stream: the response is simply ended.
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('drops the Drive answer when the viewer has already gone', async () => {
    const res = fakeResponse({ destroyed: true });
    const upstream = new Response('late');
    // A body that was already closed refuses the cancel; that must not surface.
    const cancel = jest.spyOn(upstream.body!, 'cancel').mockRejectedValue(new Error('already closed'));
    mockContent.mockResolvedValueOnce(upstream).mockResolvedValueOnce(new Response(null));
    handlerOf('/media/:token')(fakeRequest('good'), res as unknown as ExpressResponse);
    await settle();
    expect(cancel).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();

    // The same, when there is no body to drop.
    handlerOf('/media/:token')(fakeRequest('good'), res as unknown as ExpressResponse);
    await settle();
    expect(res.end).not.toHaveBeenCalled();
  });
});

describe('GET /reels/thumbnail/:token', () => {
  it('answers 404 to a forged link, and when Drive has no preview', async () => {
    expect((await request(app).get('/reels/thumbnail/forged')).status).toBe(404);
    mockThumbnail.mockResolvedValue(null);
    expect((await request(app).get('/reels/thumbnail/good')).status).toBe(404);
    expect(mockThumbnail).toHaveBeenCalledTimes(1);
  });

  it('streams the preview frame', async () => {
    mockThumbnail.mockResolvedValue(new Response('jpeg-bytes', { headers: { 'content-type': 'image/jpeg' } }));
    const res = await request(app).get('/reels/thumbnail/good');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.body.toString()).toBe('jpeg-bytes');
    expect(mockThumbnail).toHaveBeenCalledWith('drive-file-1');
  });
});

describe('when Drive cannot be reached', () => {
  it('answers 502 if nothing has been sent yet', async () => {
    mockContent.mockRejectedValue(new Error('socket hang up'));
    const res = await request(app).get('/reels/media/good');
    expect(res.status).toBe(502);
    expect(res.text).toBe('Google Drive could not be reached\n');
    expect(mockError).toHaveBeenCalledWith('reel', 'media', { error: expect.any(Error) });
  });

  it('cuts the response off if it had already begun', async () => {
    const res = fakeResponse({ headersSent: true });
    mockThumbnail.mockRejectedValue(new Error('reset'));
    handlerOf('/thumbnail/:token')(fakeRequest('good'), res as unknown as ExpressResponse);
    await settle();
    expect(res.destroy).toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith('reel', 'thumbnail', { error: expect.any(Error) });
  });

  it('says nothing when the viewer left first — that abort is not a failure', async () => {
    const res = fakeResponse({ destroyed: true });
    mockContent.mockRejectedValue(new Error('aborted'));
    handlerOf('/media/:token')(fakeRequest('good'), res as unknown as ExpressResponse);
    await settle();
    expect(mockError).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
