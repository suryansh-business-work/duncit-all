import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiteOtpModel } from '../../models/otp.model';
import { LiteUserModel } from '../../models/user.model';
import { authService } from '../../services/auth.service';
import { duncitBridge } from '../../services/duncit.bridge';
import { emailService } from '../../services/email.service';
import { envEntryService } from '../../services/envEntry.service';
import { settingsService } from '../../services/settings.service';
import { sha256 } from '../../utils/ids';
import { log } from '../../utils/log';
import { decodeToken } from '../../utils/token';
import { apiError, badInputError } from '../helpers/expect';
import { makeUser } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, adminEmails: ['founder@duncit.com'], otpTestCode: '424242', jwtSecret: 'lite-test-jwt-secret' } };
});

withTestDatabase();

afterEach(() => {
  vi.restoreAllMocks();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const pairs = (values: Record<string, string>) => Object.entries(values).map(([key, value]) => ({ key, value }));
const SMTP = { host: 'smtp.duncit.com', port: 587, user: 'mailer@duncit.com', pass: 'pw', secure: false, from: 'no-reply@duncit.com', replyTo: '' };

/** Ask for an email code as someone with no Duncit account and no mailbox configured: the stub code applies. */
async function requestStubCode(email: string) {
  vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue(null);
  vi.spyOn(log, 'warn').mockImplementation(() => undefined);
  return authService.requestCode(email);
}

async function requestDuncitCode(email: string) {
  vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue({ registered: true, expires_in_minutes: 10, resend_after_seconds: 30 });
  return authService.requestCode(email);
}

const enablePhone = (extra: Record<string, string> = {}) =>
  envEntryService.create({ name: 'MSG91', category: 'MSG91', config: pairs({ widget_id: 'widget-1', auth_key: 'auth-1', ...extra }) });

/** MSG91 on the wire: sendOtp answers request id req-77; verifyOtp answers the given verdict. */
function msg91Wire(verdict: 'success' | 'error' = 'success') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith('/sendOtp')) return json({ type: 'success', message: 'req-77' });
    return json(verdict === 'success' ? { type: 'success', message: 'OTP verified success' } : { type: 'error', message: 'OTP not match' });
  });
}

describe('authService.requestCode', () => {
  it("routes a Duncit account to the main API's own code", async () => {
    const bridge = vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue({ registered: true, expires_in_minutes: 15, resend_after_seconds: 30 });
    const send = vi.spyOn(emailService, 'send');

    const result = await authService.requestCode(' Priya@Duncit.com ');

    expect(result).toEqual({ ok: true, via: 'DUNCIT', expires_in_minutes: 15, resend_after_seconds: 30, test_code: null });
    expect(bridge).toHaveBeenCalledWith('priya@duncit.com');
    expect(send).not.toHaveBeenCalled();
    const challenge = await LiteOtpModel.findOne({ email: 'priya@duncit.com' }).lean();
    expect(challenge).toMatchObject({ via: 'DUNCIT', purpose: 'SIGN_IN', code_hash: '' });
  });

  it("hands back Lite's stub code while no mailbox is configured", async () => {
    const result = await requestStubCode('new@lite.test');
    expect(result).toEqual({ ok: true, via: 'LITE', expires_in_minutes: 10, resend_after_seconds: 45, test_code: '424242' });
    const challenge = await LiteOtpModel.findOne({ email: 'new@lite.test' }).lean();
    expect(challenge).toMatchObject({ via: 'LITE', code_hash: sha256('424242'), user_id: null });
    expect(log.warn).toHaveBeenCalledWith('auth', 'sendEmailCode', expect.objectContaining({ purpose: 'SIGN_IN' }));
  });

  it('skips the Duncit bridge when the console switched it off', async () => {
    await settingsService.update({ sign_in_with_duncit: false });
    const bridge = vi.spyOn(duncitBridge, 'requestCode');
    vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    const result = await authService.requestCode('priya@duncit.com');
    expect(result.via).toBe('LITE');
    expect(bridge).not.toHaveBeenCalled();
  });

  it('emails a fresh random code when a mailbox is configured, storing only its hash', async () => {
    vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue(null);
    vi.spyOn(emailService, 'smtp').mockResolvedValue(SMTP);
    const send = vi.spyOn(emailService, 'send').mockResolvedValue({ status: 'SENT', message: 'Sent' });

    const result = await authService.requestCode('meera@lite.test');

    expect(result).toMatchObject({ via: 'LITE', test_code: null });
    expect(send).toHaveBeenCalledTimes(1);
    const input = send.mock.calls[0][0];
    expect(input).toMatchObject({ to: 'meera@lite.test', templateKey: 'sign_in_code', vars: { minutes: 10 } });
    const code = String(input.vars.code);
    expect(code).toMatch(/^\d{6}$/);
    const challenge = await LiteOtpModel.findOne({ email: 'meera@lite.test' }).lean();
    expect(challenge?.code_hash).toBe(sha256(code));
  });

  it('reports a mail failure as UPSTREAM_ERROR', async () => {
    vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue(null);
    vi.spyOn(emailService, 'smtp').mockResolvedValue(SMTP);
    vi.spyOn(emailService, 'send').mockResolvedValue({ status: 'FAILED', message: 'Connection refused' });
    await expect(authService.requestCode('meera@lite.test')).rejects.toMatchObject(apiError('UPSTREAM_ERROR', 'We could not email the code: Connection refused'));
  });

  it('lets the person ask again at once after a mail failure, leaving no code behind', async () => {
    vi.spyOn(duncitBridge, 'requestCode').mockResolvedValue(null);
    vi.spyOn(emailService, 'smtp').mockResolvedValue(SMTP);
    vi.spyOn(emailService, 'send').mockResolvedValueOnce({ status: 'FAILED', message: 'Connection refused' }).mockResolvedValueOnce({ status: 'SENT', message: 'Sent' });
    await expect(authService.requestCode('meera@lite.test')).rejects.toMatchObject(apiError('UPSTREAM_ERROR', 'We could not email the code: Connection refused'));
    expect(await LiteOtpModel.countDocuments({ email: 'meera@lite.test' })).toBe(0);
    await expect(authService.requestCode('meera@lite.test')).resolves.toMatchObject({ ok: true, via: 'LITE' });
  });

  it('refuses a second code inside the resend window without asking the main API again', async () => {
    await requestStubCode('meera@lite.test');
    await expect(authService.requestCode('meera@lite.test')).rejects.toMatchObject(badInputError(/^Please wait \d+s before asking for another code$/));
    expect(duncitBridge.requestCode).toHaveBeenCalledTimes(1);
  });

  it('refuses a malformed email', async () => {
    await expect(authService.requestCode('meera@')).rejects.toMatchObject(badInputError('Enter a valid email address'));
  });
});

describe('authService.verifyCode', () => {
  it("creates the account on the first right code and signs it in with the person's name", async () => {
    await requestStubCode('meera@lite.test');

    const result = await authService.verifyCode('Meera@Lite.test', '424242', 'Meera Iyer');

    expect(result.user).toMatchObject({ email: 'meera@lite.test', name: 'Meera Iyer', handle: 'meera_iyer', is_admin: false, duncit_linked: false });
    expect(decodeToken(result.token)).toEqual({ id: result.user.id, email: 'meera@lite.test', is_admin: false });
    const stored = await LiteUserModel.findById(result.user.id).lean();
    expect(stored?.last_sign_in_at).toBeInstanceOf(Date);
  });

  it('names an account after its mailbox when no name is given', async () => {
    await requestStubCode('meera@lite.test');
    const result = await authService.verifyCode('meera@lite.test', '424242');
    expect(result.user).toMatchObject({ name: 'meera', handle: 'meera' });
  });

  it('refuses a wrong code, counting the guess and creating nothing', async () => {
    await requestStubCode('meera@lite.test');
    await expect(authService.verifyCode('meera@lite.test', '000000')).rejects.toMatchObject(badInputError('That code is not right'));
    expect(await LiteUserModel.countDocuments({})).toBe(0);
    expect((await LiteOtpModel.findOne({ email: 'meera@lite.test' }).lean())?.attempts).toBe(1);
  });

  it('accepts a code once', async () => {
    await requestStubCode('meera@lite.test');
    await authService.verifyCode('meera@lite.test', '424242');
    await expect(authService.verifyCode('meera@lite.test', '424242')).rejects.toMatchObject(badInputError('Ask for a new code first'));
  });

  it('checks a Duncit code with the main API and keeps what the account says about itself', async () => {
    await requestDuncitCode('priya@duncit.com');
    const verify = vi
      .spyOn(duncitBridge, 'verifyCode')
      .mockResolvedValue({ user_id: 'dun-42', name: 'Priya Sharma', email: 'priya@duncit.com', username: 'priya.s' });

    const result = await authService.verifyCode('priya@duncit.com', '777777', 'Typed name');

    expect(verify).toHaveBeenCalledWith('priya@duncit.com', '777777');
    expect(result.user).toMatchObject({ name: 'Priya Sharma', handle: 'priya_s', duncit_linked: true });
    expect((await LiteUserModel.findById(result.user.id).lean())?.duncit_user_id).toBe('dun-42');
  });

  it('refuses a Duncit code the main API rejects, leaving the challenge unspent', async () => {
    await requestDuncitCode('priya@duncit.com');
    vi.spyOn(duncitBridge, 'verifyCode').mockResolvedValue(null);
    await expect(authService.verifyCode('priya@duncit.com', '777777')).rejects.toMatchObject(badInputError('That code is not right'));
    expect((await LiteOtpModel.findOne({ email: 'priya@duncit.com' }).lean())?.consumed_at).toBeNull();
  });

  it('signs an existing account back in, linking Duncit once and promoting a bootstrap admin', async () => {
    const existing = await makeUser({ email: 'founder@duncit.com', name: 'Founder' });
    await requestDuncitCode('founder@duncit.com');
    vi.spyOn(duncitBridge, 'verifyCode').mockResolvedValue({ user_id: 'dun-1', name: 'Someone Else', email: 'founder@duncit.com', username: 'f' });

    const result = await authService.verifyCode('founder@duncit.com', '777777');

    expect(result.user).toMatchObject({ id: String(existing._id), name: 'Founder', is_admin: true, duncit_linked: true });
    expect(decodeToken(result.token)?.is_admin).toBe(true);
  });

  it('never replaces a Duncit link the account already has', async () => {
    const existing = await makeUser({ email: 'priya@duncit.com' });
    await LiteUserModel.updateOne({ _id: existing._id }, { $set: { duncit_user_id: 'dun-original' } });
    await requestDuncitCode('priya@duncit.com');
    vi.spyOn(duncitBridge, 'verifyCode').mockResolvedValue({ user_id: 'dun-other', name: 'Priya', email: 'priya@duncit.com', username: '' });
    await authService.verifyCode('priya@duncit.com', '777777');
    expect((await LiteUserModel.findById(existing._id).lean())?.duncit_user_id).toBe('dun-original');
  });

  it('makes a new account an admin when the console lists its email', async () => {
    await settingsService.update({ admin_emails: ['ops@duncit.com'] });
    await requestStubCode('ops@duncit.com');
    const result = await authService.verifyCode('ops@duncit.com', '424242');
    expect(result.user.is_admin).toBe(true);
  });

  it('refuses a blocked account', async () => {
    await makeUser({ email: 'blocked@lite.test', is_blocked: true });
    await requestStubCode('blocked@lite.test');
    await expect(authService.verifyCode('blocked@lite.test', '424242')).rejects.toMatchObject(apiError('FORBIDDEN', 'This account has been blocked'));
  });
});

describe('phone sign-in', () => {
  it('is refused with CONFIG_ERROR while no MSG91 entry exists', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(authService.requestPhoneCode('9876543210')).rejects.toMatchObject(apiError('CONFIG_ERROR', 'Phone sign-in is not available right now. Use your email instead'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is refused while the console switch is off, even with a carrier', async () => {
    await enablePhone();
    await settingsService.update({ sign_in_with_phone: false });
    await expect(authService.requestPhoneCode('9876543210')).rejects.toMatchObject(apiError('CONFIG_ERROR', /Phone sign-in is not available/));
    await expect(authService.verifyPhoneCode('9876543210', '123456')).rejects.toMatchObject(apiError('CONFIG_ERROR', /Phone sign-in is not available/));
  });

  it('texts a code through MSG91 and remembers its request id', async () => {
    await enablePhone();
    const wire = msg91Wire();

    const result = await authService.requestPhoneCode('98765 43210');

    expect(result).toEqual({ ok: true, via: 'SMS', expires_in_minutes: 10, resend_after_seconds: 45, test_code: null });
    expect(JSON.parse(String(wire.mock.calls[0][1]?.body))).toMatchObject({ widgetId: 'widget-1', identifier: '919876543210' });
    const challenge = await LiteOtpModel.findOne({ phone: '+919876543210' }).lean();
    expect(challenge).toMatchObject({ via: 'SMS', req_id: 'req-77', purpose: 'SIGN_IN' });
  });

  it("adds the entry's default country code to a national number", async () => {
    await enablePhone({ default_country_code: '44' });
    const wire = msg91Wire();
    await authService.requestPhoneCode('7911 123456');
    expect(JSON.parse(String(wire.mock.calls[0][1]?.body))).toMatchObject({ identifier: '447911123456' });
  });

  it('reports an SMS MSG91 refused as UPSTREAM_ERROR and opens no challenge', async () => {
    await enablePhone();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ type: 'error', message: 'Mobile number not valid' }));
    await expect(authService.requestPhoneCode('9876543210')).rejects.toMatchObject(apiError('UPSTREAM_ERROR', 'We could not text a code to that number: Mobile number not valid'));
    expect(await LiteOtpModel.countDocuments({})).toBe(0);
  });

  it('refuses an Indian number that is not a mobile before texting', async () => {
    await enablePhone();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(authService.requestPhoneCode('5123456789')).rejects.toMatchObject(badInputError('Enter a valid Indian mobile number'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('creates a phone-only account with no email field at all', async () => {
    await enablePhone();
    const wire = msg91Wire();
    await authService.requestPhoneCode('9876543210');

    const result = await authService.verifyPhoneCode('09876543210', ' 123456 ');

    expect(JSON.parse(String(wire.mock.calls[1][1]?.body))).toEqual({ widgetId: 'widget-1', reqId: 'req-77', otp: '123456' });
    expect(result.user).toMatchObject({ phone: '+919876543210', email: '', name: 'Guest 3210' });
    expect(decodeToken(result.token)?.email).toBe('');
    const raw = await LiteUserModel.collection.findOne({ phone: '+919876543210' });
    expect(raw).not.toBeNull();
    expect(raw).not.toHaveProperty('email');
  });

  it('lets two phone-only accounts exist side by side', async () => {
    await enablePhone();
    msg91Wire();
    await authService.requestPhoneCode('9876543210');
    await authService.verifyPhoneCode('9876543210', '123456', 'Ravi');
    await authService.requestPhoneCode('9812345678');
    await authService.verifyPhoneCode('9812345678', '123456', 'Kiran');
    expect(await LiteUserModel.countDocuments({ phone: { $exists: true } })).toBe(2);
  });

  it('refuses a code MSG91 says is wrong', async () => {
    await enablePhone();
    msg91Wire('error');
    await authService.requestPhoneCode('9876543210');
    await expect(authService.verifyPhoneCode('9876543210', '000000')).rejects.toMatchObject(badInputError('That code is not right'));
    expect(await LiteUserModel.countDocuments({})).toBe(0);
  });
});

describe('authService.signInWithGoogle', () => {
  const configure = () => envEntryService.create({ name: 'Google', category: 'GOOGLE_OAUTH', config: pairs({ client_id: 'lite.apps.googleusercontent.com' }) });

  it('is refused with CONFIG_ERROR while no client id is configured', async () => {
    await expect(authService.signInWithGoogle('token')).rejects.toMatchObject(apiError('CONFIG_ERROR', 'Google sign-in is not configured'));
  });

  it("signs in with the email Google verified for Lite's own client id", async () => {
    await configure();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ aud: 'lite.apps.googleusercontent.com', email: 'Asha.K@Gmail.com', email_verified: 'true', name: 'Asha K', sub: 'g-123' }));

    const result = await authService.signInWithGoogle('id/token+1');

    expect(String(fetchSpy.mock.calls[0][0])).toBe(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent('id/token+1')}`);
    expect(result.user).toMatchObject({ email: 'asha.k@gmail.com', name: 'Asha K' });
    expect((await LiteUserModel.findById(result.user.id).lean())?.google_sub).toBe('g-123');
  });

  const refusals: [string, Record<string, string>, number][] = [
    ['another app', { aud: 'other.apps.googleusercontent.com', email: 'a@gmail.com', email_verified: 'true' }, 200],
    ['an unverified email', { aud: 'lite.apps.googleusercontent.com', email: 'a@gmail.com', email_verified: 'false' }, 200],
    ['no email', { aud: 'lite.apps.googleusercontent.com', email_verified: 'true' }, 200],
    ['a token Google rejects', { error: 'invalid_token' }, 400],
  ];

  it.each(refusals)('refuses a token for %s', async (_case, body, status) => {
    await configure();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(body, status));
    await expect(authService.signInWithGoogle('token')).rejects.toMatchObject(badInputError('Google did not accept that sign-in. Please try again'));
  });
});

describe('authService.accountForEmail', () => {
  it('finds or makes the account for a proven email, exactly once', async () => {
    const first = await authService.accountForEmail(' Asha@Duncit.com ', 'Asha', 'dun-9');
    const again = await authService.accountForEmail('asha@duncit.com');
    expect(String(again._id)).toBe(String(first._id));
    expect(first.toObject()).toMatchObject({ email: 'asha@duncit.com', name: 'Asha', duncit_user_id: 'dun-9', is_admin: false });
  });

  it('makes a deploy-listed email an admin', async () => {
    const founder = await authService.accountForEmail('Founder@Duncit.com');
    expect(founder.is_admin).toBe(true);
  });
});
