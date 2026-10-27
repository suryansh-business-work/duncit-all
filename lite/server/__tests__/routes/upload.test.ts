import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { LiteUserDoc } from '../../models/user.model';
import { buildUploadRouter } from '../../routes/upload';
import { envEntryService } from '../../services/envEntry.service';
import { UPLOAD_MAX_BYTES } from '../../services/upload.service';
import { log } from '../../utils/log';
import { signToken } from '../../utils/token';
import { makeUser } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, jwtSecret: 'lite-test-jwt-secret' } };
});

withTestDatabase();

const app = express().use(buildUploadRouter());
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

let priya: LiteUserDoc;

beforeEach(async () => {
  priya = await makeUser({ email: 'priya@lite.test' });
  vi.spyOn(log, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const bearer = (user: LiteUserDoc) => `Bearer ${signToken(user)}`;
const configureImagekit = () => envEntryService.create({ name: 'ImageKit', category: 'IMAGEKIT', config: [{ key: 'private_key', value: 'private_abc' }] });

describe('POST /upload', () => {
  it('uploads a picture for a signed-in person and answers its URL', async () => {
    await configureImagekit();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://ik.imagekit.io/duncit/lite/cover_x1.png', fileId: 'file-1' }), { status: 200 }),
    );

    const res = await request(app).post('/upload').set('Authorization', bearer(priya)).attach('file', PNG, { filename: 'cover.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: 'https://ik.imagekit.io/duncit/lite/cover_x1.png', file_id: 'file-1' });
    const form = fetchSpy.mock.calls[0][1]?.body;
    if (!(form instanceof FormData)) throw new Error('expected a multipart upload');
    expect(form.get('fileName')).toBe('cover.png');
    const file = form.get('file');
    if (!(file instanceof Blob)) throw new Error('expected the file part');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(PNG);
  });

  it('answers 401 without a session, for a deleted account and for a blocked one', async () => {
    const blocked = await makeUser({ is_blocked: true });
    const ghost = await makeUser();
    const ghostToken = bearer(ghost);
    await ghost.deleteOne();

    for (const authorization of [undefined, 'Bearer not-a-token', ghostToken, bearer(blocked)]) {
      const call = request(app).post('/upload').attach('file', PNG, { filename: 'cover.png', contentType: 'image/png' });
      const res = await (authorization ? call.set('Authorization', authorization) : call);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Sign in to upload' });
    }
  });

  it('answers 400 when no file part was sent', async () => {
    const res = await request(app).post('/upload').set('Authorization', bearer(priya)).field('caption', 'no file here');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No file was sent' });
  });

  it('answers 415 for anything but a picture', async () => {
    const res = await request(app).post('/upload').set('Authorization', bearer(priya)).attach('file', Buffer.from('%PDF-1.7'), { filename: 'menu.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'Only JPEG, PNG, WebP, GIF or AVIF pictures' });
  });

  it('answers 413 for a picture over 10 MB, without uploading it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const big = Buffer.alloc(UPLOAD_MAX_BYTES + 1, 1);
    const res = await request(app).post('/upload').set('Authorization', bearer(priya)).attach('file', big, { filename: 'huge.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Pictures must be 10 MB or smaller' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('answers 500 with the reason when ImageKit is not configured, and logs it', async () => {
    const res = await request(app).post('/upload').set('Authorization', bearer(priya)).attach('file', PNG, { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Image uploads are not configured yet (Console → Environment → ImageKit).' });
    expect(log.error).toHaveBeenCalledWith('upload', 'post', expect.objectContaining({ user: String(priya._id) }));
  });

  it('answers 500 for a body that is not multipart', async () => {
    const res = await request(app).post('/upload').set('Authorization', bearer(priya)).send({ file: 'base64…' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/content type/i);
  });
});
