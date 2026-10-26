import nodemailer from 'nodemailer';
import { envEntryTests } from '../../envEntry.tests';
import { EnvEntryModel } from '../../envEntry.model';
import { envAttemptService } from '../../envAttempt.service';
import { recordTest } from '../../envTestLog.service';
import { isConnectionTestable, runEnvConnectionCheck } from '../../envEntry.connection';
import { recordManualSend } from '@modules/platform/whatsapp/whatsapp.manualLog';
import { emailLogService } from '@modules/content/emailLog/emailLog.service';
import { uploadToImagekit } from '@modules/platform/upload/upload.service';
import { UserModel } from '@modules/access/user/user.model';
import { normalizePhone } from '@modules/platform/otp/otp.service';
import {
  msg91RetryOtp,
  msg91SendOtp,
  msg91VerifyAccessToken,
  msg91VerifyOtp,
} from '@modules/platform/msg91/msg91.gateway';
import { logs } from '@observability/log';

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
jest.mock('../../envEntry.model', () => ({ EnvEntryModel: { findById: jest.fn(), updateOne: jest.fn() } }));
jest.mock('../../envAttempt.service', () => ({ envAttemptService: { spend: jest.fn() } }));
jest.mock('../../envTestLog.service', () => ({ recordTest: jest.fn() }));
jest.mock('../../envEntry.connection', () => ({ isConnectionTestable: jest.fn(), runEnvConnectionCheck: jest.fn() }));
jest.mock('@modules/platform/whatsapp/whatsapp.manualLog', () => ({
  recordManualSend: jest.fn(),
  WA_CONNECTION_TEST_EVENT_KEY: 'wa_connection_test',
}));
jest.mock('@modules/content/emailLog/emailLog.service', () => ({ emailLogService: { record: jest.fn() } }));
jest.mock('@modules/platform/upload/upload.service', () => ({ uploadToImagekit: jest.fn() }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('@modules/platform/otp/otp.service', () => ({ normalizePhone: jest.fn() }));
jest.mock('@modules/platform/msg91/msg91.gateway', () => ({
  msg91Identifier: jest.fn((ext: string, num: string) => `${ext}${num}`),
  msg91RetryOtp: jest.fn(),
  msg91SendOtp: jest.fn(),
  msg91VerifyAccessToken: jest.fn(),
  msg91VerifyOtp: jest.fn(),
}));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));

const ATTEMPTS = { used: 1, max: 5, window_hours: 24 };
const entry = (category: string, config: Record<string, unknown> | undefined) =>
  (EnvEntryModel.findById as jest.Mock).mockResolvedValue({ category, config });
const noEntry = () => (EnvEntryModel.findById as jest.Mock).mockResolvedValue(null);
const touched = () => (EnvEntryModel.updateOne as jest.Mock).mock.calls;
const fetchMock = jest.fn();
const reply = (ok: boolean, status: number, json: unknown) => fetchMock.mockResolvedValue({ ok, status, json: async () => json });

beforeEach(() => {
  (envAttemptService.spend as jest.Mock).mockResolvedValue({ allowed: true, attempts: ATTEMPTS });
  global.fetch = fetchMock as never;
  (emailLogService.record as jest.Mock).mockResolvedValue(undefined);
});

describe('attempt cap and outcome recording', () => {
  it('answers without running when the attempts are used up and records nothing', async () => {
    const capped = { used: 5, max: 5, window_hours: 12 };
    (envAttemptService.spend as jest.Mock).mockResolvedValue({ allowed: false, attempts: capped });
    const res = await envEntryTests.pexels('e1', 'cats');
    expect(res).toMatchObject({ ok: false, attempts: capped, details: [] });
    expect(res.message).toBe(
      'Test limit reached: 5 of 5 attempts used in the last 12 hours. Nothing was sent, so another try cannot lock the account. The limit is set in Environment Variables → Settings.'
    );
    expect(EnvEntryModel.findById).not.toHaveBeenCalled();
    expect(recordTest).not.toHaveBeenCalled();
  });

  it('records the outcome with the kind and actor and returns the attempts', async () => {
    entry('PEXELS', { api_key: '' });
    const res = await envEntryTests.pexels('e1', 'cats', 'admin@duncit.com');
    expect(res).toEqual({ ok: false, message: 'Pexels API key is not configured', attempts: ATTEMPTS });
    expect(recordTest).toHaveBeenCalledWith({
      id: 'e1', ok: false, message: 'Pexels API key is not configured', kind: 'PEXELS', actor: 'admin@duncit.com',
    });
  });

  it('throws NOT_FOUND for a missing entry and BAD_USER_INPUT for a wrong category', async () => {
    noEntry();
    await expect(envEntryTests.pexels('e1', 'q')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    entry('OPENAI', {});
    await expect(envEntryTests.pexels('e1', 'q')).rejects.toMatchObject({
      message: 'Entry is not a PEXELS entry',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(recordTest).not.toHaveBeenCalled();
  });

  it('treats an entry without a config object as an empty config', async () => {
    entry('PEXELS', undefined);
    await expect(envEntryTests.pexels('e1', 'q')).resolves.toMatchObject({ ok: false, message: 'Pexels API key is not configured' });
  });
});

describe('connection', () => {
  const run = (to?: string | null, userId: string | null = null) => envEntryTests.connection('e1', to, userId);

  it('throws for a category without a connection test', async () => {
    entry('PEXELS_X', {});
    (isConnectionTestable as jest.Mock).mockReturnValue(false);
    await expect(run()).rejects.toMatchObject({ message: 'PEXELS_X has no connection test', extensions: { code: 'BAD_USER_INPUT' } });
    expect(recordTest).not.toHaveBeenCalled();
  });

  it('checks a non-AiSensy entry with no destination, stamping use on success only', async () => {
    entry('OPENAI', { api_key: 'k', n: null });
    (isConnectionTestable as jest.Mock).mockReturnValue(true);
    (runEnvConnectionCheck as jest.Mock).mockResolvedValue({ ok: true, message: 'fine', details: [] });
    const res = await run();
    expect(res).toMatchObject({ ok: true, message: 'fine' });
    const reader = (runEnvConnectionCheck as jest.Mock).mock.calls[0][1];
    expect(reader('api_key')).toBe('k');
    expect(reader('n')).toBe('');
    expect(reader('missing')).toBe('');
    expect(runEnvConnectionCheck).toHaveBeenCalledWith('OPENAI', expect.any(Function), { to: '' });
    expect(recordManualSend).not.toHaveBeenCalled();
    expect(touched()).toHaveLength(1);

    (EnvEntryModel.updateOne as jest.Mock).mockClear();
    (runEnvConnectionCheck as jest.Mock).mockResolvedValue({ ok: false, message: 'bad', details: [] });
    await run();
    expect(touched()).toHaveLength(0);
  });

  it('uses the typed WhatsApp number (digits only) and logs the real send', async () => {
    entry('AISENSY', { campaign_name: 'cmp' });
    (isConnectionTestable as jest.Mock).mockReturnValue(true);
    (runEnvConnectionCheck as jest.Mock).mockResolvedValue({ ok: true, message: 'sent', details: [] });
    await run('+91 98765-43210');
    expect(runEnvConnectionCheck).toHaveBeenCalledWith('AISENSY', expect.any(Function), { to: '919876543210' });
    expect(recordManualSend).toHaveBeenCalledWith({
      key: 'wa_connection_test', campaign: 'cmp', destination: '919876543210', reason: '', duration_ms: expect.any(Number),
    });
  });

  it('logs the failure reason of a failed AiSensy send', async () => {
    entry('AISENSY', {});
    (isConnectionTestable as jest.Mock).mockReturnValue(true);
    (runEnvConnectionCheck as jest.Mock).mockResolvedValue({ ok: false, message: 'nope', details: [] });
    await run('123');
    expect(recordManualSend).toHaveBeenCalledWith(expect.objectContaining({ campaign: '', reason: 'nope' }));
  });

  it('falls back to the signed-in admin phone when no number is typed', async () => {
    entry('AISENSY', {});
    (isConnectionTestable as jest.Mock).mockReturnValue(true);
    (runEnvConnectionCheck as jest.Mock).mockResolvedValue({ ok: true, message: 'sent', details: [] });
    const lean = jest.fn().mockResolvedValue({ auth: { phone: { extension: '+91', number: '99999 11111' } } });
    (UserModel.findById as jest.Mock).mockReturnValue({ select: () => ({ lean }) });
    await run('', 'u1');
    expect(UserModel.findById).toHaveBeenCalledWith('u1');
    expect(runEnvConnectionCheck).toHaveBeenCalledWith('AISENSY', expect.any(Function), { to: '919999911111' });

    lean.mockResolvedValue({ auth: { phone: { number: '5551234' } } });
    await run(null, 'u1');
    expect(runEnvConnectionCheck).toHaveBeenLastCalledWith('AISENSY', expect.any(Function), { to: '5551234' });
  });

  it.each([
    ['no signed-in user', null, undefined],
    ['no user document', 'u1', null],
    ['no phone', 'u1', { auth: {} }],
    ['no phone number', 'u1', { auth: { phone: { extension: '+91' } } }],
  ])('refuses an AiSensy test with %s', async (_label, userId, doc) => {
    entry('AISENSY', {});
    (isConnectionTestable as jest.Mock).mockReturnValue(true);
    (UserModel.findById as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => doc }) });
    const res = await run(undefined, userId);
    expect(res).toMatchObject({
      ok: false,
      message: 'A WhatsApp number is required — enter one, or add a phone number to your own profile',
    });
    expect(runEnvConnectionCheck).not.toHaveBeenCalled();
  });
});

describe('email', () => {
  const transport = (info: Record<string, unknown> | Error) => {
    const sendMail = jest.fn();
    if (info instanceof Error) sendMail.mockRejectedValue(info);
    else sendMail.mockResolvedValue(info);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    return sendMail;
  };
  const logged = () => (emailLogService.record as jest.Mock).mock.calls[0][0];

  it('fails without a host and logs it', async () => {
    entry('EMAIL', {});
    const res = await envEntryTests.email('e1', 'a@b.com');
    expect(res).toMatchObject({ ok: false, message: 'SMTP host is not configured' });
    expect(logged()).toMatchObject({ status: 'FAILED', reason: 'SMTP host is not configured', to: 'a@b.com' });
  });

  it('fails without a recipient', async () => {
    entry('EMAIL', { host: 'smtp.x' });
    const res = await envEntryTests.email('e1', '   ');
    expect(res).toMatchObject({ ok: false, message: 'Recipient is required' });
    expect(logged().reason).toBe('No recipient address');
  });

  it('sends with the entry credentials, a named sender and reply-to, and stamps use', async () => {
    entry('EMAIL', { host: 'smtp.x', port: '465', user: 'u', password: 'p', from_address: 'f@x.com', from_name: 'Duncit', reply_to: 'r@x.com' });
    const sendMail = transport({ messageId: '<m1>', accepted: ['a@b.com'], rejected: [] });
    const res = await envEntryTests.email('e1', ' a@b.com ');
    expect(res).toMatchObject({ ok: true, message: 'Test email sent to a@b.com', data: '<m1>' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ host: 'smtp.x', port: 465, secure: true, auth: { user: 'u', pass: 'p' } });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'Duncit <f@x.com>', to: 'a@b.com', replyTo: 'r@x.com' }));
    expect(logged()).toMatchObject({ status: 'SENT', message_id: '<m1>', provider: 'smtp', source: 'TEST' });
    expect(touched()).toHaveLength(1);
  });

  it('defaults the port to 587, honours secure=true, omits auth without credentials and uses the user as sender', async () => {
    entry('EMAIL', { host: 'smtp.x', secure: 'true', user: 'only-user@x.com' });
    const sendMail = transport({});
    const res = await envEntryTests.email('e1', 'a@b.com');
    expect(res).toMatchObject({ ok: true, data: '' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ host: 'smtp.x', port: 587, secure: true, auth: undefined });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'only-user@x.com', replyTo: undefined }));
    expect(logged().message_id).toBe('');
  });

  it('is insecure on a plain port without the secure flag', async () => {
    entry('EMAIL', { host: 'smtp.x', port: '25' });
    transport({ accepted: ['a@b.com'] });
    await envEntryTests.email('e1', 'a@b.com');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 25, secure: false }));
  });

  it('reports a refusal when every recipient is rejected', async () => {
    entry('EMAIL', { host: 'smtp.x' });
    transport({ accepted: [], rejected: ['a@b.com', 'c@d.com'] });
    const res = await envEntryTests.email('e1', 'a@b.com');
    expect(res).toMatchObject({ ok: false, message: 'smtp.x refused a@b.com, c@d.com' });
    expect(logged()).toMatchObject({ status: 'FAILED', reason: 'Refused by the mail server: a@b.com, c@d.com' });
  });

  it('treats a response with rejections and no accepted list as a refusal', async () => {
    entry('EMAIL', { host: 'smtp.x' });
    transport({ rejected: ['a@b.com'] });
    await expect(envEntryTests.email('e1', 'a@b.com')).resolves.toMatchObject({ ok: false, message: 'smtp.x refused a@b.com' });
  });

  it('still counts as sent when some recipients were accepted despite rejections', async () => {
    entry('EMAIL', { host: 'smtp.x' });
    transport({ accepted: ['a@b.com'], rejected: ['c@d.com'] });
    await expect(envEntryTests.email('e1', 'a@b.com')).resolves.toMatchObject({ ok: true });
  });

  it('returns the transport error message, or a default when it has none', async () => {
    entry('EMAIL', { host: 'smtp.x' });
    transport(new Error('ECONNREFUSED'));
    await expect(envEntryTests.email('e1', 'a@b.com')).resolves.toMatchObject({ ok: false, message: 'ECONNREFUSED' });
    transport(Object.assign(new Error(''), { message: '' }));
    await expect(envEntryTests.email('e1', 'a@b.com')).resolves.toMatchObject({ message: 'Failed to send test email' });
  });

  it('warns but still answers when writing the email log fails', async () => {
    entry('EMAIL', { host: '' });
    (emailLogService.record as jest.Mock).mockRejectedValue(new Error('db down'));
    const res = await envEntryTests.email('e1', 'a@b.com');
    await new Promise((resolve) => setImmediate(resolve));
    expect(res.ok).toBe(false);
    expect(logs.server.warn).toHaveBeenCalledWith('emailLog', 'record', { error: expect.any(Error), subject: 'Duncit Tech — SMTP test email' });
  });
});

describe('imagekitUpload', () => {
  it('needs a private key', async () => {
    entry('IMAGEKIT', {});
    await expect(envEntryTests.imagekitUpload('e1', 'AAAA', 'f.png')).resolves.toMatchObject({ ok: false, message: 'ImageKit private key is not configured' });
  });

  it.each(['', 'data:image/png;base64,', 'data:,'])('rejects an empty file (%p)', async (payload) => {
    entry('IMAGEKIT', { private_key: 'pk' });
    await expect(envEntryTests.imagekitUpload('e1', payload, 'f.png')).resolves.toMatchObject({ ok: false, message: 'No file provided' });
    expect(uploadToImagekit).not.toHaveBeenCalled();
  });

  it('uploads the decoded bytes with the entry key and returns the url', async () => {
    entry('IMAGEKIT', { private_key: 'pk' });
    (uploadToImagekit as jest.Mock).mockResolvedValue({ url: 'https://ik/x.png' });
    const res = await envEntryTests.imagekitUpload('e1', `data:image/png;base64,${Buffer.from('hi').toString('base64')}`, 'f.png');
    expect(res).toMatchObject({ ok: true, url: 'https://ik/x.png' });
    expect(uploadToImagekit).toHaveBeenCalledWith({ fileBytes: Buffer.from('hi'), fileName: 'f.png', folder: '/tech-tests', privateKey: 'pk' });
    expect(touched()).toHaveLength(1);
  });

  it('names an unnamed upload and accepts a bare base64 payload', async () => {
    entry('IMAGEKIT', { private_key: 'pk' });
    (uploadToImagekit as jest.Mock).mockResolvedValue({ url: 'u' });
    await envEntryTests.imagekitUpload('e1', Buffer.from('x').toString('base64'), '');
    expect((uploadToImagekit as jest.Mock).mock.calls[0][0].fileName).toMatch(/^tech-test-\d+$/);
  });

  it('returns the upload error, or a default message', async () => {
    entry('IMAGEKIT', { private_key: 'pk' });
    (uploadToImagekit as jest.Mock).mockRejectedValueOnce(new Error('403 forbidden'));
    await expect(envEntryTests.imagekitUpload('e1', 'AAAA', 'f')).resolves.toMatchObject({ ok: false, message: '403 forbidden' });
    (uploadToImagekit as jest.Mock).mockRejectedValueOnce({});
    await expect(envEntryTests.imagekitUpload('e1', 'AAAA', 'f')).resolves.toMatchObject({ message: 'ImageKit upload failed' });
    expect(touched()).toHaveLength(0);
  });
});

describe('pexels', () => {
  it('searches with the entry key and returns the medium photo urls', async () => {
    entry('PEXELS', { api_key: 'pk' });
    reply(true, 200, { photos: [{ src: { medium: 'a' } }, { src: {} }, null, { src: { medium: 'b' } }] });
    const res = await envEntryTests.pexels('e1', ' dogs & cats ');
    expect(res).toMatchObject({ ok: true, message: 'Loaded 2 photos for "dogs & cats"', data: '["a","b"]' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.pexels.com/v1/search?query=dogs%20%26%20cats&per_page=6', { headers: { Authorization: 'pk' } });
    expect(touched()).toHaveLength(1);
  });

  it('defaults the query and tolerates a body without photos', async () => {
    entry('PEXELS', { api_key: 'pk' });
    reply(true, 200, {});
    const res = await envEntryTests.pexels('e1', '  ');
    expect(res).toMatchObject({ ok: true, message: 'Loaded 0 photos for "nature"', data: '[]' });
  });

  it('reports an HTTP rejection', async () => {
    entry('PEXELS', { api_key: 'pk' });
    reply(false, 401, {});
    await expect(envEntryTests.pexels('e1', 'q')).resolves.toMatchObject({ ok: false, message: 'Pexels rejected the request (HTTP 401)' });
    expect(touched()).toHaveLength(0);
  });

  it('reports a network failure, with a default when the error has no message', async () => {
    entry('PEXELS', { api_key: 'pk' });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(envEntryTests.pexels('e1', 'q')).resolves.toMatchObject({ message: 'offline' });
    fetchMock.mockRejectedValueOnce({});
    await expect(envEntryTests.pexels('e1', 'q')).resolves.toMatchObject({ message: 'Pexels request failed' });
  });
});

describe('twilioCall', () => {
  const full = { account_sid: 'AC1', auth_token: 'tok', phone_number: '+1555' };

  it.each([[{ auth_token: 't', phone_number: 'p' }], [{ account_sid: 's', phone_number: 'p' }], [{ account_sid: 's', auth_token: 't' }]])(
    'requires SID, token and number (%j)',
    async (config) => {
      entry('TWILIO', config);
      await expect(envEntryTests.twilioCall('e1', '+1')).resolves.toMatchObject({ ok: false, message: 'Account SID, auth token and phone number are required' });
    }
  );

  it('requires a recipient', async () => {
    entry('TWILIO', full);
    await expect(envEntryTests.twilioCall('e1', ' ')).resolves.toMatchObject({ ok: false, message: 'Recipient number is required' });
  });

  it('places the call with basic auth and returns the call sid', async () => {
    entry('TWILIO', full);
    reply(true, 201, { sid: 'CA9' });
    const res = await envEntryTests.twilioCall('e1', ' +1999 ');
    expect(res).toMatchObject({ ok: true, message: 'Call placed to +1999', data: 'CA9' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC1/Calls.json');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('AC1:tok').toString('base64')}`);
    expect(init.body.get('To')).toBe('+1999');
    expect(init.body.get('From')).toBe('+1555');
    expect(touched()).toHaveLength(1);
  });

  it('returns an empty sid when Twilio sent none', async () => {
    entry('TWILIO', full);
    reply(true, 201, {});
    await expect(envEntryTests.twilioCall('e1', '+1')).resolves.toMatchObject({ ok: true, data: '' });
  });

  it('returns Twilio’s own message, or the status, on failure', async () => {
    entry('TWILIO', full);
    reply(false, 400, { message: 'Invalid To' });
    await expect(envEntryTests.twilioCall('e1', '+1')).resolves.toMatchObject({ ok: false, message: 'Invalid To' });
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('not json'); } });
    await expect(envEntryTests.twilioCall('e1', '+1')).resolves.toMatchObject({ message: 'Twilio call failed (HTTP 500)' });
  });

  it('reports a network failure with a default message', async () => {
    entry('TWILIO', full);
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(envEntryTests.twilioCall('e1', '+1')).resolves.toMatchObject({ message: 'offline' });
    fetchMock.mockRejectedValueOnce({});
    await expect(envEntryTests.twilioCall('e1', '+1')).resolves.toMatchObject({ message: 'Twilio call failed' });
  });
});

describe('openai', () => {
  it('needs an api key', async () => {
    entry('OPENAI', {});
    await expect(envEntryTests.openai('e1', 'hi')).resolves.toMatchObject({ ok: false, message: 'API key is not configured' });
  });

  it('calls the configured base url and model and returns the reply', async () => {
    entry('OPENAI', { api_key: 'k', base_url: 'https://proxy/v1/', model: 'gpt-x' });
    reply(true, 200, { choices: [{ message: { content: 'hello' } }] });
    const res = await envEntryTests.openai('e1', ' say hi ');
    expect(res).toMatchObject({ ok: true, message: 'OpenAI responded', data: 'hello' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://proxy/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(init.body)).toEqual({ model: 'gpt-x', messages: [{ role: 'user', content: 'say hi' }], max_tokens: 64 });
    expect(touched()).toHaveLength(1);
  });

  it('defaults base url, model and prompt, and an empty reply', async () => {
    entry('OPENAI', { api_key: 'k' });
    reply(true, 200, {});
    const res = await envEntryTests.openai('e1', '');
    expect(res).toMatchObject({ ok: true, data: '' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(JSON.parse(init.body)).toMatchObject({ model: 'gpt-4o-mini', messages: [{ content: 'Say hello in one short sentence.' }] });
  });

  it('returns the API error message or the status', async () => {
    entry('OPENAI', { api_key: 'k' });
    reply(false, 401, { error: { message: 'bad key' } });
    await expect(envEntryTests.openai('e1', 'x')).resolves.toMatchObject({ ok: false, message: 'bad key' });
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => { throw new Error('x'); } });
    await expect(envEntryTests.openai('e1', 'x')).resolves.toMatchObject({ message: 'OpenAI error (HTTP 429)' });
  });

  it('reports a network failure with a default message', async () => {
    entry('OPENAI', { api_key: 'k' });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(envEntryTests.openai('e1', 'x')).resolves.toMatchObject({ message: 'offline' });
    fetchMock.mockRejectedValueOnce({});
    await expect(envEntryTests.openai('e1', 'x')).resolves.toMatchObject({ message: 'OpenAI request failed' });
  });
});

describe('gemini', () => {
  it('needs an api key', async () => {
    entry('GEMINI', {});
    await expect(envEntryTests.gemini('e1', 'hi')).resolves.toMatchObject({ ok: false, message: 'API key is not configured' });
  });

  it('calls the configured model with the key url-encoded and returns the reply', async () => {
    entry('GEMINI', { api_key: 'a&b', model: 'gemini-x' });
    reply(true, 200, { candidates: [{ content: { parts: [{ text: 'hey' }] } }] });
    const res = await envEntryTests.gemini('e1', ' yo ');
    expect(res).toMatchObject({ ok: true, message: 'Gemini responded', data: 'hey' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent?key=a%26b');
    expect(JSON.parse(init.body)).toEqual({ contents: [{ parts: [{ text: 'yo' }] }] });
  });

  it('defaults the model, prompt and reply', async () => {
    entry('GEMINI', { api_key: 'k' });
    reply(true, 200, {});
    const res = await envEntryTests.gemini('e1', '');
    expect(res).toMatchObject({ ok: true, data: '' });
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-1.5-flash:generateContent');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[0].text).toBe('Say hello in one short sentence.');
  });

  it('returns the API error message or the status, and network failures', async () => {
    entry('GEMINI', { api_key: 'k' });
    reply(false, 400, { error: { message: 'API key not valid' } });
    await expect(envEntryTests.gemini('e1', 'x')).resolves.toMatchObject({ message: 'API key not valid' });
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => { throw new Error('x'); } });
    await expect(envEntryTests.gemini('e1', 'x')).resolves.toMatchObject({ message: 'Gemini error (HTTP 503)' });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(envEntryTests.gemini('e1', 'x')).resolves.toMatchObject({ message: 'offline' });
    fetchMock.mockRejectedValueOnce({});
    await expect(envEntryTests.gemini('e1', 'x')).resolves.toMatchObject({ message: 'Gemini request failed' });
  });
});

describe('msg91', () => {
  const creds = { widget_id: 'w', auth_key: 'a' };
  const input = (over: Record<string, unknown>) => ({ action: 'SEND_OTP' as const, ...over }) as never;

  it.each([[{ widget_id: 'w' }], [{ auth_key: 'a' }]])('needs both widget id and auth key (%j)', async (config) => {
    entry('MSG91', config);
    await expect(envEntryTests.msg91('e1', input({}))).resolves.toMatchObject({ ok: false, message: 'Widget ID and auth key are both required' });
  });

  it('sends an OTP to the normalised phone and stamps the entry through the tracked path', async () => {
    entry('MSG91', creds);
    (normalizePhone as jest.Mock).mockReturnValue({ phone_extension: '91', phone_number: '9876543210' });
    (msg91SendOtp as jest.Mock).mockResolvedValue({ ok: true, message: 'req-1' });
    const res = await envEntryTests.msg91('e1', input({ phone_extension: '+91', phone_number: '98765 43210' }), 'ops');
    expect(res).toMatchObject({ ok: true, message: 'Code sent — the request id is below', data: 'req-1', attempts: ATTEMPTS });
    expect(normalizePhone).toHaveBeenCalledWith('+91', '98765 43210');
    expect(msg91SendOtp).toHaveBeenCalledWith(creds, '919876543210');
    expect(recordTest).toHaveBeenCalledWith(expect.objectContaining({ kind: 'MSG91_SEND', actor: 'ops', ok: true }));
  });

  it('does not spend an attempt or record anything for the later steps', async () => {
    entry('MSG91', creds);
    (msg91RetryOtp as jest.Mock).mockResolvedValue({ ok: true, message: 'again' });
    const res = await envEntryTests.msg91('e1', input({ action: 'RETRY_OTP', req_id: ' r1 ', retry_channel: 11 }));
    expect(res).toEqual({ ok: true, message: 'Code sent again', data: 'again' });
    expect(msg91RetryOtp).toHaveBeenCalledWith(creds, 'r1', 11);
    expect(envAttemptService.spend).not.toHaveBeenCalled();
    expect(recordTest).not.toHaveBeenCalled();
  });

  it('verifies the code and the access token', async () => {
    entry('MSG91', creds);
    (msg91VerifyOtp as jest.Mock).mockResolvedValue({ ok: true, message: 'tok' });
    await expect(envEntryTests.msg91('e1', input({ action: 'VERIFY_OTP', req_id: ' r1 ', otp: ' 1234 ' }))).resolves.toEqual({
      ok: true, message: 'Code verified — the access token is below', data: 'tok',
    });
    expect(msg91VerifyOtp).toHaveBeenCalledWith(creds, 'r1', '1234');
    (msg91VerifyAccessToken as jest.Mock).mockResolvedValue({ ok: true, message: 'verified' });
    await expect(envEntryTests.msg91('e1', input({ action: 'VERIFY_ACCESS_TOKEN', access_token: ' t ' }))).resolves.toEqual({
      ok: true, message: 'MSG91 issued this access token', data: 'verified',
    });
    expect(msg91VerifyAccessToken).toHaveBeenCalledWith(creds, 't');
  });

  it.each([
    ['RETRY_OTP', {}, 'A request id is required'],
    ['RETRY_OTP', { req_id: '  ' }, 'A request id is required'],
    ['VERIFY_OTP', { req_id: 'r' }, 'A request id and the code are required'],
    ['VERIFY_OTP', { otp: '1' }, 'A request id and the code are required'],
    ['VERIFY_ACCESS_TOKEN', {}, 'An access token is required'],
  ])('refuses %s with missing input before calling MSG91', async (action, extra, message) => {
    entry('MSG91', creds);
    await expect(envEntryTests.msg91('e1', input({ action, ...extra }))).resolves.toEqual({ ok: false, message });
    expect(msg91RetryOtp).not.toHaveBeenCalled();
    expect(msg91VerifyOtp).not.toHaveBeenCalled();
    expect(msg91VerifyAccessToken).not.toHaveBeenCalled();
  });

  it('relays MSG91 refusals with their code, without stamping the entry', async () => {
    entry('MSG91', creds);
    (msg91VerifyOtp as jest.Mock).mockResolvedValue({ ok: false, message: 'otp mismatch', code: 703 });
    await expect(envEntryTests.msg91('e1', input({ action: 'VERIFY_OTP', req_id: 'r', otp: '1' }))).resolves.toEqual({
      ok: false, message: 'MSG91 refused: otp mismatch (code 703)',
    });
    expect(touched()).toHaveLength(0);
  });

  it('returns a thrown error (e.g. a bad phone shape) as the result, or a default message', async () => {
    entry('MSG91', creds);
    (normalizePhone as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid phone number');
    });
    await expect(envEntryTests.msg91('e1', input({}))).resolves.toMatchObject({ ok: false, message: 'Invalid phone number' });
    expect(msg91SendOtp).not.toHaveBeenCalled();
    (normalizePhone as jest.Mock).mockImplementation(() => {
      throw {};
    });
    await expect(envEntryTests.msg91('e1', input({}))).resolves.toMatchObject({ message: 'MSG91 request failed' });
  });
});
