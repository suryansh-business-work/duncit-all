import { envEntryTests } from '../../envEntry.tests';
import { envEntryService } from '../../envEntry.service';

const sendMailMock = jest.fn();
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: () => ({ sendMail: (...a: any[]) => sendMailMock(...a) }) },
}));

const cfg = (pairs: Record<string, any>) => pairs;

describe('envEntry interactive tests', () => {
  afterEach(() => {
    delete (global as any).fetch;
    sendMailMock.mockReset();
  });

  it('email: sends and stamps last_used_at; validates host + recipient', async () => {
    const entry = await envEntryService.create({
      name: 'SMTP', category: 'EMAIL', config: cfg({ host: 'smtp.test', port: 587, user: 'u', password: 'p', from_address: 'a@b.com' }),
    });
    sendMailMock.mockResolvedValue({ messageId: 'mid-1' });
    const res = await envEntryTests.email(entry!.id, 'dest@x.com');
    expect(res.ok).toBe(true);
    expect(res.data).toBe('mid-1');
    expect((await envEntryService.get(entry!.id))?.last_used_at).toBeTruthy();

    expect((await envEntryTests.email(entry!.id, '')).ok).toBe(false); // no recipient
    const noHost = await envEntryService.create({ name: 'NoHost', category: 'EMAIL', config: cfg({}) });
    expect((await envEntryTests.email(noHost!.id, 'd@x.com')).ok).toBe(false);
  });

  it('email: surfaces transport errors', async () => {
    const entry = await envEntryService.create({ name: 'S2', category: 'EMAIL', config: cfg({ host: 'smtp.test' }) });
    sendMailMock.mockRejectedValue(new Error('auth failed'));
    const res = await envEntryTests.email(entry!.id, 'd@x.com');
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/auth failed/);
  });

  it('imagekit: uploads and returns a url', async () => {
    const entry = await envEntryService.create({ name: 'IK', category: 'IMAGEKIT', config: cfg({ private_key: 'k' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://ik.io/test.jpg' }) });
    const res = await envEntryTests.imagekitUpload(entry!.id, 'data:image/png;base64,QQ==', 'x.png');
    expect(res.ok).toBe(true);
    expect(res.url).toBe('https://ik.io/test.jpg');
  });

  it('imagekit: fails on empty file and upstream error', async () => {
    const entry = await envEntryService.create({ name: 'IK2', category: 'IMAGEKIT', config: cfg({ private_key: 'k' }) });
    expect((await envEntryTests.imagekitUpload(entry!.id, '', 'x.png')).ok).toBe(false);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, statusText: 'Bad', json: async () => ({ message: 'nope' }) });
    const res = await envEntryTests.imagekitUpload(entry!.id, 'QQ==', 'x.png');
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/nope/);
  });

  it('pexels: returns photo urls as JSON', async () => {
    const entry = await envEntryService.create({ name: 'PX', category: 'PEXELS', config: cfg({ api_key: 'k' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ photos: [{ src: { medium: 'u1' } }, { src: { medium: 'u2' } }] }),
    });
    const res = await envEntryTests.pexels(entry!.id, 'cats');
    expect(res.ok).toBe(true);
    expect(JSON.parse(res.data!)).toEqual(['u1', 'u2']);
  });

  it('twilio: places a call and validates required fields', async () => {
    const entry = await envEntryService.create({ name: 'TW', category: 'TWILIO', config: cfg({ account_sid: 'AC', auth_token: 't', phone_number: '+1' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sid: 'CA1' }) });
    const res = await envEntryTests.twilioCall(entry!.id, '+919876543210');
    expect(res.ok).toBe(true);
    expect(res.data).toBe('CA1');
    expect((await envEntryTests.twilioCall(entry!.id, '')).ok).toBe(false);
  });

  it('openai + gemini run prompts against their own categories', async () => {
    const openai = await envEntryService.create({ name: 'OAI', category: 'OPENAI', config: cfg({ api_key: 'k' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'hi' } }] }) });
    expect((await envEntryTests.openai(openai!.id, 'hello')).data).toBe('hi');

    const gemini = await envEntryService.create({ name: 'GEM', category: 'GEMINI', config: cfg({ api_key: 'k' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'namaste' }] } }] }) });
    expect((await envEntryTests.gemini(gemini!.id, 'hello')).data).toBe('namaste');

    // category guard: openai test on a gemini entry throws
    await expect(envEntryTests.openai(gemini!.id, 'x')).rejects.toThrow(/not a OPENAI entry/i);
  });

  it('openai: surfaces upstream errors and missing key', async () => {
    const noKey = await envEntryService.create({ name: 'OAI2', category: 'OPENAI', config: cfg({}) });
    expect((await envEntryTests.openai(noKey!.id, 'x')).ok).toBe(false);
    const ok = await envEntryService.create({ name: 'OAI3', category: 'OPENAI', config: cfg({ api_key: 'k' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'bad key' } }) });
    const res = await envEntryTests.openai(ok!.id, 'x');
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/bad key/);
  });

  it('rejects a category mismatch', async () => {
    const entry = await envEntryService.create({ name: 'PX2', category: 'PEXELS', config: cfg({ api_key: 'k' }) });
    await expect(envEntryTests.email(entry!.id, 'd@x.com')).rejects.toThrow(/not a EMAIL entry/i);
  });

  it('records pass/fail outcome on the entry after a test', async () => {
    const entry = await envEntryService.create({ name: 'PXrec', category: 'PEXELS', config: cfg({ api_key: 'k' }) });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ photos: [] }) });
    await envEntryTests.pexels(entry!.id, 'x');
    expect((await envEntryService.get(entry!.id))?.last_test_ok).toBe(true);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await envEntryTests.pexels(entry!.id, 'x');
    const after = await envEntryService.get(entry!.id);
    expect(after?.last_test_ok).toBe(false);
    expect(after?.last_tested_at).toBeTruthy();
  });
});
