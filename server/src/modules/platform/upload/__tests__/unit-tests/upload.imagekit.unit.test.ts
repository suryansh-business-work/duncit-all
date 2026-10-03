/**
 * The one call that puts a file on ImageKit, and the upload routes that feed
 * it. The credential entry, the outbound fetch, the admin Upload Settings, the
 * image pipeline and the AI scan are faked; what is under test is the request
 * ImageKit receives (Basic auth on the private key alone, the form fields), how
 * an ImageKit refusal is worded, the kinds and caps a base64 upload is
 * classified into, the processing fallback, and the spooled-image path.
 */
jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/platform/envEntry/envEntry.model', () => ({
  ...jest.requireActual('@modules/platform/envEntry/envEntry.model'),
  EnvEntryModel: { find: jest.fn() },
}));
jest.mock('@modules/ai/aiMonitoring/aiMonitoring.service', () => ({ mediaScanService: { record: jest.fn() } }));
jest.mock('../../mediaProcessing', () => ({
  ...jest.requireActual('../../mediaProcessing'),
  getUploadSettingsSafe: jest.fn(),
  processImageBytes: jest.fn(),
}));

import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { logs } from '@observability/log';
import { outboundFetch } from '@utils/outboundFetch';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { mediaScanService } from '@modules/ai/aiMonitoring/aiMonitoring.service';
import { getUploadSettingsSafe, processImageBytes } from '../../mediaProcessing';
import {
  getImagekitConfig,
  uploadBase64Image,
  uploadFileToImagekit,
  uploadSpooledFileToImagekit,
  uploadToImagekit,
} from '../../upload.service';

const fetchMock = outboundFetch as jest.Mock;
const envFind = EnvEntryModel.find as jest.Mock;
const scan = mediaScanService.record as jest.Mock;
const settings = getUploadSettingsSafe as jest.Mock;
const processBytes = processImageBytes as jest.Mock;
const logError = logs.server.error as jest.Mock;

const IMAGEKIT_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const PRIVATE_KEY = 'private_fake_key';
const basicAuth = (key: string) => 'Basic ' + Buffer.from(key + ':').toString('base64');

const entries = (list: unknown[]) => envFind.mockReturnValue({ lean: jest.fn().mockResolvedValue(list) });
const imagekitEntry = (config: Record<string, unknown>, name = 'ImageKit') => ({ name, config });

const okUpload = (body: Record<string, unknown> = { url: 'https://ik.example.test/f.jpg', fileId: 'file-1' }) =>
  fetchMock.mockResolvedValue({ ok: true, json: async () => body });

const fakeSetting = (over: Record<string, unknown> = {}) => ({
  surface: 'MOBILE',
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  allowed_video_formats: ['mp4', 'mov', 'webm'],
  ...over,
});

/** The FormData ImageKit was sent in call `n`. */
const sentForm = (n = 0): FormData => fetchMock.mock.calls[n][2].body;

beforeEach(() => {
  entries([imagekitEntry({ public_key: 'public_fake', private_key: PRIVATE_KEY, url_endpoint: 'https://ik.example.test' })]);
  settings.mockResolvedValue(null);
  scan.mockResolvedValue(undefined);
});

describe('getImagekitConfig', () => {
  it('reads all three values from one active default entry, trimmed', async () => {
    entries([imagekitEntry({ public_key: ' pub ', private_key: ' priv ', url_endpoint: 'https://ik.example.test ' })]);

    await expect(getImagekitConfig()).resolves.toEqual({
      publicKey: 'pub',
      privateKey: 'priv',
      urlEndpoint: 'https://ik.example.test',
    });
    expect(envFind).toHaveBeenCalledWith({ category: 'IMAGEKIT', is_active: true, is_default: true });
  });

  it('stringifies a numeric value and blanks anything that is not a string or number', async () => {
    entries([imagekitEntry({ public_key: 12345, private_key: { nested: true }, url_endpoint: null })]);
    await expect(getImagekitConfig()).resolves.toEqual({ publicKey: '12345', privateKey: '', urlEndpoint: '' });
  });

  it('answers blanks when no entry exists, or the entry has no config', async () => {
    entries([]);
    await expect(getImagekitConfig()).resolves.toEqual({ publicKey: '', privateKey: '', urlEndpoint: '' });
    entries([{ name: 'Bare' }]);
    await expect(getImagekitConfig()).resolves.toEqual({ publicKey: '', privateKey: '', urlEndpoint: '' });
  });

  it('refuses two default entries, naming both, rather than mixing their keys', async () => {
    entries([imagekitEntry({}, 'Prod Kit'), imagekitEntry({}, 'Old Kit')]);

    await expect(getImagekitConfig()).rejects.toMatchObject({
      message: expect.stringContaining('More than one ImageKit entry is marked active and default (Prod Kit, Old Kit)'),
      extensions: { code: 'CONFIG_ERROR' },
    });
    expect(logError).toHaveBeenCalledWith('upload', 'getImagekitConfig', {
      error: 'Multiple default ImageKit entries: Prod Kit, Old Kit',
    });
  });
});

describe('uploadToImagekit', () => {
  it('posts the file with Basic auth on the private key alone, plus folder and tags', async () => {
    okUpload({ url: 'https://ik.example.test/a.jpg', fileId: 'f-1', thumbnailUrl: 'https://ik.example.test/t.jpg' });

    const res = await uploadToImagekit({
      fileBytes: Buffer.from('jpeg-bytes'),
      fileName: 'a.jpg',
      folder: '/pods',
      tags: ['pexels', 'import'],
      privateKey: 'explicit_key',
    });

    expect(res).toEqual({ url: 'https://ik.example.test/a.jpg', fileId: 'f-1', thumbnailUrl: 'https://ik.example.test/t.jpg' });
    // An explicit key (the Tech portal's test) never reads the configured entry.
    expect(envFind).not.toHaveBeenCalled();
    const [service, url, init] = fetchMock.mock.calls[0];
    expect(service).toBe('ImageKit');
    expect(url).toBe(IMAGEKIT_URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: basicAuth('explicit_key') });
    const form = sentForm();
    expect(form.get('fileName')).toBe('a.jpg');
    expect(form.get('useUniqueFileName')).toBe('true');
    expect(form.get('folder')).toBe('/pods');
    expect(form.get('tags')).toBe('pexels,import');
    const file = form.get('file') as Blob;
    expect(Buffer.from(await file.arrayBuffer()).toString()).toBe('jpeg-bytes');
  });

  it('uses the configured key and leaves folder and tags off when not given', async () => {
    okUpload();

    await uploadToImagekit({ fileBytes: Buffer.from('x'), fileName: 'x.jpg', tags: [] });

    expect(fetchMock.mock.calls[0][2].headers).toEqual({ Authorization: basicAuth(PRIVATE_KEY) });
    expect(sentForm().has('folder')).toBe(false);
    expect(sentForm().has('tags')).toBe(false);
  });

  it('refuses before any request when no private key is configured', async () => {
    entries([imagekitEntry({ public_key: 'pub' })]);

    await expect(uploadToImagekit({ fileBytes: Buffer.from('x'), fileName: 'x.jpg' })).rejects.toMatchObject({
      message: 'ImageKit is not configured',
      extensions: { code: 'CONFIG_ERROR' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('words an ImageKit refusal with ImageKit’s own message', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Bad Request', json: async () => ({ message: 'Invalid file' }) });

    await expect(uploadToImagekit({ fileBytes: Buffer.from('x'), fileName: 'x.jpg' })).rejects.toMatchObject({
      message: 'ImageKit upload failed: Invalid file',
      extensions: { code: 'UPSTREAM_ERROR' },
    });
  });

  it('falls back to the HTTP status text when the refusal is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });

    await expect(uploadToImagekit({ fileBytes: Buffer.from('x'), fileName: 'x.jpg' })).rejects.toMatchObject({
      message: 'ImageKit upload failed: Service Unavailable',
    });
  });
});

describe('uploadFileToImagekit', () => {
  it('streams a file from disk under the configured key', async () => {
    const file = path.join(os.tmpdir(), `duncit-upload-imagekit-${process.pid}-artifact.apk`);
    await fsp.writeFile(file, Buffer.from('apk-bytes'));
    okUpload({ url: 'https://ik.example.test/app.apk', fileId: 'f-apk' });
    try {
      const res = await uploadFileToImagekit({ filePath: file, fileName: 'app.apk', folder: '/builds' });

      expect(res).toEqual({ url: 'https://ik.example.test/app.apk', fileId: 'f-apk', thumbnailUrl: undefined });
      expect(sentForm().get('folder')).toBe('/builds');
      const sent = sentForm().get('file') as Blob;
      expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('apk-bytes');
    } finally {
      await fsp.unlink(file).catch(() => undefined);
    }
  });
});

describe('uploadBase64Image', () => {
  it('rejects anything that is not an image or video, unless documents are allowed', async () => {
    const pdf = Buffer.from('%PDF').toString('base64');
    await expect(
      uploadBase64Image({ fileBase64: pdf, fileName: 'doc.pdf', mimeType: 'application/pdf' })
    ).rejects.toMatchObject({ message: 'Only image or video uploads are allowed', extensions: { code: 'BAD_USER_INPUT' } });
    await expect(
      uploadBase64Image({ fileBase64: pdf, fileName: 'archive.zip', mimeType: 'application/zip', allowDocuments: true })
    ).rejects.toMatchObject({ message: 'Only image, video or document uploads are allowed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads a document when allowed (by mime or by extension) and never scans it', async () => {
    okUpload();
    await uploadBase64Image({
      fileBase64: Buffer.from('%PDF').toString('base64'),
      fileName: 'gst invoice.pdf',
      mimeType: 'application/pdf',
      allowDocuments: true,
    });
    await uploadBase64Image({
      fileBase64: Buffer.from('a,b').toString('base64'),
      fileName: 'sheet.csv',
      mimeType: 'application/octet-stream',
      allowDocuments: true,
    });

    expect(sentForm(0).get('fileName')).toBe('gst_invoice.pdf');
    expect(sentForm(1).get('fileName')).toBe('sheet.csv');
    expect(scan).not.toHaveBeenCalled();
  });

  it('strips a data-URL prefix and treats a blank mime as JPEG', async () => {
    okUpload();

    await uploadBase64Image({
      fileBase64: `data:image/jpeg;base64,${Buffer.from('jpeg!').toString('base64')}`,
      fileName: 'pic.jpg',
      mimeType: '  ',
    });

    const sent = sentForm().get('file') as Blob;
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('jpeg!');
  });

  it('refuses an empty upload', async () => {
    await expect(
      uploadBase64Image({ fileBase64: 'data:image/png;base64,', fileName: 'a.png', mimeType: 'image/png' })
    ).rejects.toMatchObject({ message: 'Upload file is empty', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('names a nameless upload by time and records the image for AI monitoring', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-01T00:00:00.000Z'), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
    okUpload({ url: 'https://ik.example.test/u.jpg', fileId: 'f-u' });
    try {
      await uploadBase64Image({
        fileBase64: Buffer.from('img').toString('base64'),
        fileName: '',
        mimeType: 'image/jpeg',
        folder: '/avatars',
        surface: 'MWEB',
        userId: 'user-1',
      });
    } finally {
      jest.useRealTimers();
    }

    const name = `upload-${Date.parse('2026-11-01T00:00:00.000Z')}`;
    expect(sentForm().get('fileName')).toBe(name);
    expect(scan).toHaveBeenCalledWith({
      url: 'https://ik.example.test/u.jpg',
      fileName: name,
      folder: '/avatars',
      surface: 'MWEB',
      userId: 'user-1',
    });
  });

  it('never lets a failed AI scan fail the upload', async () => {
    okUpload();
    scan.mockRejectedValue(new Error('scanner down'));

    await expect(
      uploadBase64Image({ fileBase64: Buffer.from('img').toString('base64'), fileName: 'a.jpg', mimeType: 'image/jpeg' })
    ).resolves.toMatchObject({ fileId: 'file-1' });
  });

  it('runs the admin image pipeline with the crop, re-encoding a disallowed format to .jpg', async () => {
    settings.mockResolvedValue(fakeSetting({ allowed_image_formats: ['jpeg'] }));
    processBytes.mockResolvedValue(Buffer.from('processed'));
    okUpload();
    const crop = { x: 1, y: 2, width: 30, height: 40 };

    await uploadBase64Image({
      fileBase64: Buffer.from('raw-png').toString('base64'),
      fileName: 'shot.png',
      mimeType: 'image/png',
      surface: 'MOBILE',
      crop,
      cropPresetKey: 'POD_FEATURE',
    });

    expect(settings).toHaveBeenCalledWith('MOBILE');
    expect(processBytes).toHaveBeenCalledWith({
      fileBytes: Buffer.from('raw-png'),
      mimeType: 'image/png',
      setting: expect.objectContaining({ allowed_image_formats: ['jpeg'] }),
      crop,
      cropPresetKey: 'POD_FEATURE',
      forceJpeg: true,
    });
    expect(sentForm().get('fileName')).toBe('shot.jpg');
    const sent = sentForm().get('file') as Blob;
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('processed');
  });

  it('keeps the name when the format is allowed (jpeg counts as jpg)', async () => {
    settings.mockResolvedValue(fakeSetting({ allowed_image_formats: ['jpg'] }));
    processBytes.mockResolvedValue(Buffer.from('processed'));
    okUpload();

    await uploadBase64Image({ fileBase64: Buffer.from('raw').toString('base64'), fileName: 'p.jpeg', mimeType: 'image/jpeg' });

    expect(processBytes.mock.calls[0][0].forceJpeg).toBe(false);
    expect(sentForm().get('fileName')).toBe('p.jpeg');
  });

  it('uploads the original when image processing fails, and logs why', async () => {
    settings.mockResolvedValue(fakeSetting());
    const boom = new Error('sharp crashed');
    processBytes.mockRejectedValue(boom);
    okUpload();

    await uploadBase64Image({ fileBase64: Buffer.from('original').toString('base64'), fileName: 'a.png', mimeType: 'image/png' });

    const sent = sentForm().get('file') as Blob;
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('original');
    expect(sentForm().get('fileName')).toBe('a.png');
    expect(logError).toHaveBeenCalledWith('upload', 'processImageForUpload', {
      error: boom,
      msg: 'image processing failed, uploading original',
      safeName: 'a.png',
    });
  });

  it('accepts a video with no extension under the admin settings (no format to check)', async () => {
    settings.mockResolvedValue(fakeSetting({ allowed_video_formats: ['webm'] }));
    okUpload();

    await expect(
      uploadBase64Image({ fileBase64: Buffer.from('vid').toString('base64'), fileName: 'clip', mimeType: 'video/mp4' })
    ).resolves.toMatchObject({ fileId: 'file-1' });
    expect(processBytes).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
  });
});

describe('uploadSpooledFileToImagekit — images', () => {
  const spool = async (name: string, content: string) => {
    const file = path.join(os.tmpdir(), `duncit-spool-imagekit-${process.pid}-${name}`);
    await fsp.writeFile(file, Buffer.from(content));
    return file;
  };

  it('reads a spooled image, runs the admin pipeline and uploads the processed bytes', async () => {
    settings.mockResolvedValue(fakeSetting({ allowed_image_formats: ['jpg'] }));
    processBytes.mockResolvedValue(Buffer.from('smaller'));
    okUpload({ url: 'https://ik.example.test/s.jpg', fileId: 'f-s' });
    const file = await spool('shot.webp', 'raw-webp');
    try {
      const res = await uploadSpooledFileToImagekit({
        filePath: file,
        fileName: 'my shot.webp',
        bytes: 8,
        folder: '/reviews',
        surface: 'MWEB',
      });

      expect(processBytes).toHaveBeenCalledWith(
        expect.objectContaining({ fileBytes: Buffer.from('raw-webp'), mimeType: 'image/webp', forceJpeg: true })
      );
      expect(res).toEqual({
        uploaded: { url: 'https://ik.example.test/s.jpg', fileId: 'f-s', thumbnailUrl: undefined },
        fileName: 'my_shot.jpg',
        isImage: true,
      });
      expect(sentForm().get('folder')).toBe('/reviews');
      const sent = sentForm().get('file') as Blob;
      expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('smaller');
    } finally {
      await fsp.unlink(file).catch(() => undefined);
    }
  });

  it('refuses a non-processable image format the admin removed', async () => {
    settings.mockResolvedValue(fakeSetting({ allowed_image_formats: ['jpg'] }));
    const file = await spool('anim.gif', 'GIF89a');
    try {
      await expect(
        uploadSpooledFileToImagekit({ filePath: file, fileName: 'anim.gif', bytes: 6, surface: 'MOBILE' })
      ).rejects.toMatchObject({ message: 'Image format .gif is not allowed (allowed: jpg)' });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await fsp.unlink(file).catch(() => undefined);
    }
  });

  it('streams an image as-is when the settings cannot be read', async () => {
    okUpload();
    const file = await spool('raw.png', 'png');
    try {
      const res = await uploadSpooledFileToImagekit({ filePath: file, fileName: 'raw.png', bytes: 3 });
      expect(res).toMatchObject({ fileName: 'raw.png', isImage: true });
      expect(processBytes).not.toHaveBeenCalled();
    } finally {
      await fsp.unlink(file).catch(() => undefined);
    }
  });

  it('names a nameless spooled file by time and files it as a document', async () => {
    okUpload();
    const file = await spool('blob', 'bytes');
    try {
      const res = await uploadSpooledFileToImagekit({ filePath: file, fileName: '', bytes: 5 });
      expect(res.fileName).toMatch(/^upload-\d+$/);
      expect(res.isImage).toBe(false);
    } finally {
      await fsp.unlink(file).catch(() => undefined);
    }
  });
});
