/**
 * Problem reports from the public status page, against a real database:
 * what a stranger's form is allowed to write, what the server attributes
 * itself, how screenshots are handled when the upload fails, and what Tech can
 * do with a report afterwards. Only the image upload is faked.
 */
jest.mock('@modules/platform/upload/upload.service', () => ({ uploadBase64Image: jest.fn() }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { uploadBase64Image } from '@modules/platform/upload/upload.service';
import { StatusReportModel } from '../../statusReport.model';
import { statusReportService as service } from '../../statusReport.service';
import { MAX_REPORT_IMAGES, uploadReportImages } from '../../statusReport.images';

const upload = uploadBase64Image as jest.Mock;
const form = (over: Record<string, unknown> = {}) => ({
  service_key: 'mweb', impact: 'ERRORS', name: ' Asha Rao ', email: ' Asha@Example.COM ', page_url: ' https://mweb.duncit.com/pods ',
  message: ' The pods page shows a blank screen. ', ...over,
});
const shot = (n: number) => ({ file_name: `shot-${n}.png`, data: `base64-${n}`, mime_type: 'image/png' });

beforeEach(() => {
  upload.mockReset().mockImplementation(async ({ fileName }: { fileName: string }) => ({ url: `https://ik.example.com/status-reports/${fileName}` }));
  jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
});
afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.APP_ENV;
});

describe('submit', () => {
  it('files a report with the service resolved from the catalogue, the text cleaned, and the origin as the server read it', async () => {
    const out = await service.submit(form() as never, { ip: '203.0.113.9', user_agent: 'UA/1', user_id: 'user-1' });
    expect(out).toEqual({ ok: true, id: expect.any(String) });
    expect(await StatusReportModel.findById(out.id).lean()).toMatchObject({
      service_key: 'mweb', service_name: 'mWeb', service_url: 'https://mweb.duncit.com/', impact: 'ERRORS', name: 'Asha Rao', email: 'asha@example.com',
      page_url: 'https://mweb.duncit.com/pods', message: 'The pods page shows a blank screen.', environment: 'production', status: 'NEW',
      ip: '203.0.113.9', user_agent: 'UA/1', user_id: 'user-1', image_urls: [],
    });
  });

  it('treats an unknown or missing service as "not sure" and a missing impact as OTHER', async () => {
    const unknown = await service.submit(form({ service_key: 'retired-service', impact: undefined, page_url: undefined }) as never, {});
    expect(await StatusReportModel.findById(unknown.id).lean()).toMatchObject({
      service_key: '', service_name: '', service_url: '', impact: 'OTHER', page_url: '', ip: null, user_agent: null, user_id: null,
    });
    const none = await service.submit(form({ service_key: '' }) as never, { ip: null, user_agent: null, user_id: null });
    expect((await StatusReportModel.findById(none.id).lean())?.service_key).toBe('');
  });

  it('records the deployment that answered the form', async () => {
    process.env.APP_ENV = 'staging';
    const out = await service.submit(form() as never, {});
    expect((await StatusReportModel.findById(out.id).lean())?.environment).toBe('staging');
  });

  it.each([
    ['a missing name', { name: '   ' }, 'Name is required'],
    ['a missing email', { email: '' }, 'Email is required'],
    ['an email that is not one', { email: 'not-an-email' }, 'Invalid email'],
    ['a message that is too short', { message: 'too short' }, expect.any(String)],
    ['an impact that is not one of the choices', { impact: 'EXPLODING' }, expect.any(String)],
  ])('refuses %s', async (_label, over, message) => {
    await expect(service.submit(form(over) as never, {})).rejects.toMatchObject({ message, extensions: { code: 'BAD_USER_INPUT' } });
    expect(await StatusReportModel.countDocuments()).toBe(0);
  });

  it('refuses a value it cannot even read rather than failing with a server error', async () => {
    await expect(service.submit(form({ service_key: { not: 'a string' } }) as never, {})).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('attaches the screenshots that uploaded, drops the one that did not, and still files the report', async () => {
    upload.mockImplementation(async ({ fileName }: { fileName: string }) => {
      if (fileName === 'shot-2.png') throw new Error('HEIC is not allowed');
      return { url: `https://ik.example.com/status-reports/${fileName}` };
    });
    const out = await service.submit({ ...form(), images: [shot(1), shot(2), shot(3)] } as never, {});
    expect((await StatusReportModel.findById(out.id).lean())?.image_urls).toEqual([
      'https://ik.example.com/status-reports/shot-1.png', 'https://ik.example.com/status-reports/shot-3.png',
    ]);
    expect(logs.server.warn).toHaveBeenCalledWith('statusReport', 'screenshot', expect.objectContaining({ fileName: 'shot-2.png' }));
  });
});

describe('uploadReportImages', () => {
  it('uploads nothing for no images', async () => {
    await expect(uploadReportImages(undefined)).resolves.toEqual([]);
    await expect(uploadReportImages(null)).resolves.toEqual([]);
    await expect(uploadReportImages([])).resolves.toEqual([]);
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads at most three, in order, into the status-reports folder', async () => {
    const urls = await uploadReportImages([1, 2, 3, 4, 5].map(shot));
    expect(urls).toHaveLength(MAX_REPORT_IMAGES);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload.mock.calls[0][0]).toEqual({ fileBase64: 'base64-1', fileName: 'shot-1.png', folder: '/status-reports', mimeType: 'image/png' });
  });

  it('names an unnamed screenshot and assumes PNG for one with no type', async () => {
    await uploadReportImages([{ file_name: '', data: 'x', mime_type: null }]);
    expect(upload.mock.calls[0][0]).toMatchObject({ fileName: 'screenshot.png', mimeType: 'image/png' });
  });
});

describe('the Tech table', () => {
  it('pages reports newest first with the stored fields as the public shape', async () => {
    await service.submit(form({ name: 'First' }) as never, { ip: '1.1.1.1' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.submit(form({ name: 'Second' }) as never, {});
    const page = await service.table({ page: 1, page_size: 10 } as never);
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.name)).toEqual(['Second', 'First']);
    expect(page.rows[1]).toMatchObject({ ip: '1.1.1.1', service_name: 'mWeb', note: '', image_urls: [], staff_image_urls: [] });
    expect(page.rows[0].created_at).toEqual(expect.any(String));
    expect((await service.table()).total).toBe(2);
  });
});

describe('updateStatus', () => {
  const filed = async () => (await service.submit(form() as never, {})).id;

  it('moves a report through triage with a note, and leaves the staff images alone when none are given', async () => {
    const id = await filed();
    await service.updateStatus(id, 'IN_PROGRESS', 'looking', ['https://x/a.png']);
    const out = await service.updateStatus(id, 'RESOLVED', 'fixed in 4.2');
    expect(out).toMatchObject({ status: 'RESOLVED', note: 'fixed in 4.2', staff_image_urls: ['https://x/a.png'] });
  });

  it('leaves the note alone when none is given, and cuts a long one at two thousand characters', async () => {
    const id = await filed();
    await service.updateStatus(id, 'IN_PROGRESS', 'keep me');
    expect((await service.updateStatus(id, 'RESOLVED')).note).toBe('keep me');
    expect((await service.updateStatus(id, 'RESOLVED', null)).note).toBe('keep me');
    expect((await service.updateStatus(id, 'RESOLVED', 'n'.repeat(2500))).note).toHaveLength(2000);
  });

  it('trims the staff images, drops blanks, keeps ten, and clears them all with an empty list', async () => {
    const id = await filed();
    const many = [' https://x/0.png ', '', '   ', ...Array.from({ length: 12 }, (_, i) => `https://x/${i + 1}.png`)];
    const out = await service.updateStatus(id, 'IN_PROGRESS', null, many);
    expect(out.staff_image_urls).toHaveLength(10);
    expect(out.staff_image_urls[0]).toBe('https://x/0.png');
    expect((await service.updateStatus(id, 'IN_PROGRESS', null, [])).staff_image_urls).toEqual([]);
  });

  it('says NOT_FOUND for a report that does not exist', async () => {
    await expect(service.updateStatus(String(new Types.ObjectId()), 'CLOSED')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('remove', () => {
  it('deletes the named reports and counts them, and does nothing for an empty list', async () => {
    const a = (await service.submit(form() as never, {})).id;
    const b = (await service.submit(form() as never, {})).id;
    await service.submit(form() as never, {});
    await expect(service.remove([])).resolves.toBe(0);
    await expect(service.remove([a, b, String(new Types.ObjectId())])).resolves.toBe(2);
    expect(await StatusReportModel.countDocuments()).toBe(1);
  });
});
