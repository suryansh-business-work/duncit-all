import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiteEnvEntryModel, type LiteEnvCategory } from '../../models/envEntry.model';
import { emailService } from '../../services/email.service';
import { envEntryService } from '../../services/envEntry.service';
import { envTestService } from '../../services/envTest.service';
import { apiError, badInputError } from '../helpers/expect';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

withTestDatabase();

afterEach(() => {
  vi.restoreAllMocks();
});

async function entry(category: LiteEnvCategory, values: Record<string, string>): Promise<string> {
  const created = await envEntryService.create({ name: `${category} entry`, category, config: Object.entries(values).map(([key, value]) => ({ key, value })) });
  return created.id;
}

const lastResult = async (id: string) => (await LiteEnvEntryModel.findById(id).lean())?.last_test_ok;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('envTestService.test', () => {
  it('checks the shape of a Google OAuth client id and stamps the result', async () => {
    const good = await entry('GOOGLE_OAUTH', { client_id: '1234-abc.apps.googleusercontent.com' });
    await expect(envTestService.test(good, null, 'admin@duncit.com')).resolves.toEqual({ ok: true, message: 'Client id has the expected shape' });
    expect(await lastResult(good)).toBe(true);

    const bad = await entry('GOOGLE_OAUTH', { client_id: '1234-abc' });
    await expect(envTestService.test(bad, null, null)).resolves.toEqual({ ok: false, message: 'A Google OAuth client id ends with .apps.googleusercontent.com' });
    expect(await lastResult(bad)).toBe(false);
  });

  it('proves a Maps browser key with a Places call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ suggestions: [] }));
    const id = await entry('GOOGLE_MAPS', { api_key: 'AIza-browser' });
    await expect(envTestService.test(id, null, null)).resolves.toEqual({ ok: true, message: 'Google accepted this key for place search' });
    expect(String(fetchSpy.mock.calls[0][0])).toBe('https://places.googleapis.com/v1/places:autocomplete');
  });

  it('asks for both MSG91 values before calling MSG91', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const id = await entry('MSG91', { widget_id: 'widget-1' });
    await expect(envTestService.test(id, null, null)).resolves.toEqual({ ok: false, message: 'Widget ID and auth key are both required' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await lastResult(id)).toBe(false);
  });

  it('proves an MSG91 auth key against its analytics report', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [] }));
    const id = await entry('MSG91', { widget_id: 'widget-1', auth_key: 'auth-1' });
    const result = await envTestService.test(id, null, null);
    expect(result.ok).toBe(true);
    expect(await lastResult(id)).toBe(true);
  });

  it('reports an ImageKit key the vendor rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ message: 'Unauthorized' }, 401));
    const id = await entry('IMAGEKIT', { private_key: 'private_wrong' });
    await expect(envTestService.test(id, null, null)).resolves.toEqual({ ok: false, message: 'ImageKit rejected the key (HTTP 401)' });
  });

  it('needs an SMTP host before sending a test email', async () => {
    const sendRaw = vi.spyOn(emailService, 'sendRaw');
    const id = await entry('EMAIL', { user: 'mailer@duncit.com' });
    await expect(envTestService.test(id, 'ops@duncit.com', null)).resolves.toEqual({ ok: false, message: 'SMTP host is required' });
    expect(sendRaw).not.toHaveBeenCalled();
  });

  it("sends a real test email through the entry's own mailbox, to the address given", async () => {
    const sendRaw = vi.spyOn(emailService, 'sendRaw').mockResolvedValue({ status: 'SENT', message: 'Sent to ops@duncit.com' });
    const id = await entry('EMAIL', { host: 'smtp.duncit.com', port: '465', user: 'mailer@duncit.com', password: 'pw', from_address: 'no-reply@duncit.com' });

    await expect(envTestService.test(id, ' Ops@Duncit.com ', 'admin@duncit.com')).resolves.toEqual({ ok: true, message: 'Sent to ops@duncit.com' });

    const [to, subject, body, siteName, override] = sendRaw.mock.calls[0];
    expect(to).toBe('ops@duncit.com');
    expect(subject).toBe('Duncit Lite test email');
    expect(body).toContain('test email from the Lite console');
    expect(siteName).toBe('Duncit Lite');
    expect(override).toMatchObject({ host: 'smtp.duncit.com', port: 465, user: 'mailer@duncit.com', pass: 'pw', from: 'no-reply@duncit.com' });
    expect(await lastResult(id)).toBe(true);
  });

  it("falls back to the admin's own address and reports a failed send", async () => {
    const sendRaw = vi.spyOn(emailService, 'sendRaw').mockResolvedValue({ status: 'FAILED', message: 'Invalid login' });
    const id = await entry('EMAIL', { host: 'smtp.duncit.com' });
    await expect(envTestService.test(id, '', 'admin@duncit.com')).resolves.toEqual({ ok: false, message: 'Invalid login' });
    expect(sendRaw.mock.calls[0][0]).toBe('admin@duncit.com');
    expect(await lastResult(id)).toBe(false);
  });

  it('refuses a malformed recipient without stamping a result', async () => {
    const id = await entry('EMAIL', { host: 'smtp.duncit.com' });
    await expect(envTestService.test(id, 'ops-at-duncit', null)).rejects.toMatchObject(badInputError('Enter a valid email address'));
    expect(await lastResult(id)).toBeNull();
  });

  it('answers NOT_FOUND for an unknown entry', async () => {
    await expect(envTestService.test('507f1f77bcf86cd799439011', null, null)).rejects.toMatchObject(apiError('NOT_FOUND', 'Environment entry could not be found'));
  });
});
