/**
 * The one way Duncit issues and checks a one-time code, against a real
 * database: who a code can be addressed to, which channels survive the
 * recipient's own switches, what a resend replaces, how a guess is counted,
 * and how a verified code is carried to the step that spends it exactly once.
 * Only the transports, the e2e hold, the channel preference and MSG91's checker
 * are faked.
 */
jest.mock('@observability/log', () => ({ logs: { server: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));
jest.mock('@modules/platform/otp/otp.delivery', () => ({ deliverOtp: jest.fn() }));
jest.mock('@modules/platform/e2eRun/e2eRun.codes', () => ({ E2E_HELD_REASON: 'held for the e2e suite', holdRunAccountCode: jest.fn() }));
jest.mock('@modules/access/commPreference/commPreference.service', () => ({ commPreferenceService: { allowedPhoneMediums: jest.fn() } }));
jest.mock('@modules/platform/msg91/msg91.gateway', () => ({ msg91VerifyOtp: jest.fn(), runtimeMsg91Credentials: jest.fn() }));

import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { commPreferenceService } from '@modules/access/commPreference/commPreference.service';
import { holdRunAccountCode } from '@modules/platform/e2eRun/e2eRun.codes';
import { msg91VerifyOtp, runtimeMsg91Credentials } from '@modules/platform/msg91/msg91.gateway';
import { deliverOtp } from '../../otp.delivery';
import { OtpChallengeModel } from '../../otp.model';
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SEC, OTP_TTL_MS } from '../../otp.constants';
import { anyDelivered, deliberatelyStubbed, normalizeEmail, normalizePhone, normalizeTarget, otpService } from '../../otp.service';

const deliver = deliverOtp as jest.Mock;
const hold = holdRunAccountCode as jest.Mock;
const allowedPhone = commPreferenceService.allowedPhoneMediums as jest.Mock;
const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const PHONE = { phone_extension: '+91', phone_number: '9876543210' };
const sentBy = (medium: string, extra: Record<string, unknown> = {}) => ({ medium, status: 'SENT', reason: '', ...extra });

/** The code the transport was last asked to carry. */
const lastCode = () => deliver.mock.calls.at(-1)?.[0].code as string;

beforeEach(() => {
  jest.clearAllMocks();
  hold.mockResolvedValue(false);
  deliver.mockImplementation(async ({ medium }: { medium: string }) => sentBy(medium));
  allowedPhone.mockImplementation(async (_number: string, mediums: string[]) => mediums);
  (runtimeMsg91Credentials as jest.Mock).mockResolvedValue(null);
  delete process.env.OTP_TEST_CODE;
});

describe('normalizing a destination', () => {
  it('reads a phone pair, adding the plus and dropping punctuation', () => {
    expect(normalizePhone('91', ' 98765-43210 ')).toEqual({ phone_extension: '+91', phone_number: '9876543210' });
    expect(normalizePhone('+91', '9876543210')).toEqual({ phone_extension: '+91', phone_number: '9876543210' });
  });

  it('refuses a missing country code and a number that is not one', () => {
    expect(() => normalizePhone(undefined, '9876543210')).toThrow('Country code is required');
    expect(() => normalizePhone(null, '9876543210')).toThrow('Country code is required');
    expect(() => normalizePhone('+91', undefined)).toThrow('Enter a valid phone number');
    expect(() => normalizePhone('+91', '12')).toThrow('Enter a valid phone number');
  });

  it('reads a mailbox lower-cased, and refuses anything that is not one', () => {
    expect(normalizeEmail('  Asha@Example.COM ')).toBe('asha@example.com');
    expect(() => normalizeEmail('nope')).toThrow('Enter a valid email address');
    expect(() => normalizeEmail(undefined)).toThrow('Enter a valid email address');
    expect(() => normalizeEmail(42)).toThrow('Enter a valid email address');
  });

  it('validates only the halves the requested mediums need', () => {
    expect(normalizeTarget({ email: 'a@b.co' }, ['EMAIL'])).toEqual({ phone_extension: '', phone_number: '', email: 'a@b.co' });
    expect(normalizeTarget({ phone_extension: '91', phone_number: '9876543210' }, ['WHATSAPP'])).toEqual({ ...PHONE, email: '' });
    expect(normalizeTarget({ ...PHONE, email: 'a@b.co' }, ['SMS', 'EMAIL'])).toEqual({ ...PHONE, email: 'a@b.co' });
    expect(() => normalizeTarget({ email: 'a@b.co' }, ['WHATSAPP'])).toThrow('Country code is required');
    expect(() => normalizeTarget({ ...PHONE }, ['EMAIL'])).toThrow('Enter a valid email address');
  });
});

describe('what a set of deliveries means', () => {
  it('counts only a real send as delivered, and only a deliberate stub as stubbed', () => {
    expect(anyDelivered([{ medium: 'SMS', status: 'FAILED', reason: '' }, { medium: 'EMAIL', status: 'SENT', reason: '' }])).toBe(true);
    expect(anyDelivered([{ medium: 'SMS', status: 'STUBBED', reason: '' }])).toBe(false);
    expect(anyDelivered([])).toBe(false);
    expect(deliberatelyStubbed([{ medium: 'SMS', status: 'STUBBED', reason: '' }, { medium: 'WHATSAPP', status: 'STUBBED', reason: '' }])).toBe(true);
    expect(deliberatelyStubbed([{ medium: 'SMS', status: 'STUBBED', reason: '' }, { medium: 'EMAIL', status: 'FAILED', reason: '' }])).toBe(false);
    expect(deliberatelyStubbed([])).toBe(false);
  });
});

describe('request', () => {
  it('issues a six-digit code over every requested medium, and stores only its hash', async () => {
    const out = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP', 'SMS'], ...PHONE, recipient_name: ' Asha ', context: { pod: 'p1' }, requested_by: String(new Types.ObjectId()) });
    expect(out).toMatchObject({ resend_after_seconds: OTP_RESEND_COOLDOWN_SEC, test_code: null, deliveries: [{ medium: 'WHATSAPP', status: 'SENT' }, { medium: 'SMS', status: 'SENT' }] });
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(lastCode()).toMatch(/^\d{6}$/);
    const doc = await OtpChallengeModel.findById(out.challenge_id).lean();
    expect(doc).toMatchObject({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP', 'SMS'], ...PHONE, email: '', recipient_name: 'Asha', code_hash: sha(lastCode()), attempts: 0, verified_at: null, consumed_at: null, context: { pod: 'p1' } });
    expect(new Date(out.expires_at).getTime() - Date.now()).toBeLessThanOrEqual(OTP_TTL_MS);
    expect(JSON.stringify(out)).not.toContain(lastCode());
  });

  it('addresses a mailbox when the medium is email, with no phone required', async () => {
    const out = await otpService.request({ purpose: 'PASSWORD_RESET', mediums: ['EMAIL'], email: ' Asha@Example.com ' });
    expect(await OtpChallengeModel.findById(out.challenge_id).lean()).toMatchObject({ email: 'asha@example.com', phone_number: '', recipient_name: '', context: {}, requested_by: null });
    expect(allowedPhone).not.toHaveBeenCalled();
  });

  it('ignores mediums the platform does not know and repeats, and refuses a request left with none', async () => {
    const out = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['SMS', 'PIGEON', 'SMS'], ...PHONE });
    expect(out.deliveries.map((d) => d.medium)).toEqual(['SMS']);
    await expect(otpService.request({ purpose: 'ATTENDANCE', mediums: ['PIGEON'], ...PHONE })).rejects.toMatchObject({ message: 'Choose at least one way to send the code', extensions: { code: 'BAD_USER_INPUT' } });
    await expect(otpService.request({ purpose: 'ATTENDANCE', mediums: [], ...PHONE })).rejects.toMatchObject({ message: 'Choose at least one way to send the code' });
    await expect(otpService.request({ purpose: 'ATTENDANCE', mediums: undefined as never, ...PHONE })).rejects.toMatchObject({ message: 'Choose at least one way to send the code' });
  });

  it('drops the phone channels the number’s owner switched off, but keeps email, and refuses when none is left', async () => {
    allowedPhone.mockResolvedValueOnce(['WHATSAPP']);
    const out = await otpService.request({ purpose: 'LOGIN', mediums: ['WHATSAPP', 'SMS', 'EMAIL'], ...PHONE, email: 'a@b.co' });
    expect(out.deliveries.map((d) => d.medium)).toEqual(['WHATSAPP', 'EMAIL']);
    allowedPhone.mockResolvedValueOnce([]);
    await expect(otpService.request({ purpose: 'LOGIN', mediums: ['WHATSAPP', 'SMS'], ...PHONE })).rejects.toMatchObject({
      message: 'This number has switched off one-time codes on every channel we could use.', extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('makes a resend wait out the cooldown, then replaces the code on the same challenge and revokes its grant', async () => {
    const first = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE });
    await expect(otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE })).rejects.toMatchObject({ extensions: { code: 'TOO_MANY_REQUESTS' }, message: expect.stringMatching(/^Wait \d+s before asking for another code$/) });
    const firstCode = lastCode();
    const doc = await OtpChallengeModel.findById(first.challenge_id).select('+grant_hash');
    await otpService.grant(doc!);
    await OtpChallengeModel.updateOne({ _id: first.challenge_id }, { $set: { last_sent_at: new Date(Date.now() - 60_000), attempts: 3, verified_at: new Date() } });
    const second = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE });
    expect(second.challenge_id).toBe(first.challenge_id);
    expect(await OtpChallengeModel.countDocuments()).toBe(1);
    const after = await OtpChallengeModel.findById(first.challenge_id).select('+grant_hash').lean();
    expect(after).toMatchObject({ attempts: 0, verified_at: null, grant_hash: '', code_hash: sha(lastCode()) });
    expect(sha(firstCode)).not.toBe(after?.code_hash);
  });

  it('keeps challenges for different purposes and destinations apart', async () => {
    await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE });
    await expect(otpService.request({ purpose: 'LOGIN', mediums: ['WHATSAPP'], ...PHONE })).resolves.toBeDefined();
    await expect(otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE, phone_number: '9000000001' })).resolves.toBeDefined();
    expect(await OtpChallengeModel.countDocuments()).toBe(3);
  });

  it('hands the fixed test code back only when every medium was a deliberate stub', async () => {
    deliver.mockImplementation(async ({ medium }: { medium: string }) => ({ medium, status: 'STUBBED', reason: 'no provider' }));
    const stubbed = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP', 'SMS'], ...PHONE });
    expect(stubbed.test_code).toBe('123456');
    expect(await OtpChallengeModel.findById(stubbed.challenge_id).lean()).toMatchObject({ code_hash: sha('123456') });
    await OtpChallengeModel.deleteMany({});
    process.env.OTP_TEST_CODE = '654321';
    expect((await otpService.request({ purpose: 'ATTENDANCE', mediums: ['SMS'], ...PHONE })).test_code).toBe('654321');
  });

  it('never reveals a code that failed to send, or that went out beside a stub', async () => {
    deliver.mockImplementation(async ({ medium }: { medium: string }) => ({ medium, status: 'FAILED', reason: 'outage' }));
    expect((await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE })).test_code).toBeNull();
    await OtpChallengeModel.deleteMany({});
    deliver.mockImplementation(async ({ medium }: { medium: string }) => (medium === 'SMS' ? { medium, status: 'STUBBED', reason: '' } : sentBy(medium)));
    expect((await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP', 'SMS'], ...PHONE })).test_code).toBeNull();
  });

  it('records a code for the e2e run account instead of sending it, and reports it sent', async () => {
    hold.mockResolvedValue(true);
    const out = await otpService.request({ purpose: 'LOGIN', mediums: ['EMAIL', 'WHATSAPP'], email: 'run@example.com', ...PHONE });
    expect(deliver).not.toHaveBeenCalled();
    expect(out.deliveries).toEqual([{ medium: 'EMAIL', status: 'SENT', reason: 'held for the e2e suite' }, { medium: 'WHATSAPP', status: 'SENT', reason: 'held for the e2e suite' }]);
    expect(hold).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'LOGIN', email: 'run@example.com', code: expect.stringMatching(/^\d{6}$/) }));
  });

  it('keeps MSG91’s request id on the challenge, out of what it returns', async () => {
    deliver.mockImplementation(async ({ medium }: { medium: string }) => sentBy(medium, medium === 'SMS' ? { request_id: 'req-77' } : {}));
    const out = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP', 'SMS'], ...PHONE });
    expect(JSON.stringify(out)).not.toContain('req-77');
    expect((await OtpChallengeModel.findById(out.challenge_id).select('+sms_request_id').lean())?.sms_request_id).toBe('req-77');
  });
});

describe('verifying a code', () => {
  const issue = async (purpose = 'ATTENDANCE' as const) => {
    const out = await otpService.request({ purpose, mediums: ['WHATSAPP'], ...PHONE });
    return { id: out.challenge_id, code: lastCode() };
  };

  it('accepts the right code and marks the challenge verified, trimming what was typed', async () => {
    const { id, code } = await issue();
    const doc = await otpService.verify(id, ` ${code} `);
    expect(doc.verified_at).toBeInstanceOf(Date);
    expect((await OtpChallengeModel.findById(id).lean())?.verified_at).toBeInstanceOf(Date);
  });

  it('counts every wrong guess, says how many are left, and burns the challenge at the limit', async () => {
    const { id, code } = await issue();
    await expect(otpService.verify(id, '000000')).rejects.toMatchObject({ message: `Incorrect code — ${OTP_MAX_ATTEMPTS - 1} attempts left`, extensions: { code: 'BAD_USER_INPUT' } });
    for (let left = OTP_MAX_ATTEMPTS - 2; left >= 1; left -= 1) {
      await expect(otpService.verify(id, '000000')).rejects.toMatchObject({ message: `Incorrect code — ${left} attempts left` });
    }
    await expect(otpService.verify(id, '000000')).rejects.toMatchObject({ message: 'Incorrect code' });
    await expect(otpService.verify(id, code)).rejects.toMatchObject({ message: 'Too many wrong codes — send a new one', extensions: { code: 'TOO_MANY_REQUESTS' } });
  });

  it('counts a missing or blank code as a wrong one', async () => {
    const { id } = await issue();
    await expect(otpService.verify(id, undefined as never)).rejects.toThrow(/Incorrect code/);
    await expect(otpService.verify(id, '   ')).rejects.toThrow(/Incorrect code/);
    expect((await OtpChallengeModel.findById(id).lean())?.attempts).toBe(2);
  });

  it('counts a wrong code against a challenge that was already verified', async () => {
    const { id, code } = await issue();
    await otpService.verify(id, code);
    await expect(otpService.verify(id, '111111')).rejects.toThrow(/Incorrect code/);
    expect((await OtpChallengeModel.findById(id).lean())?.attempts).toBe(1);
  });

  it('refuses a challenge that is unknown, malformed, spent or expired', async () => {
    await expect(otpService.verify(String(new Types.ObjectId()), '123456')).rejects.toMatchObject({ message: 'That code request has expired — send a new one' });
    await expect(otpService.verify('not-an-id', '123456')).rejects.toMatchObject({ message: 'That code request has expired — send a new one' });
    const { id, code } = await issue();
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
    await expect(otpService.verify(id, code)).rejects.toMatchObject({ message: 'That code has expired — send a new one' });
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { expires_at: new Date(Date.now() + 60_000), consumed_at: new Date() } });
    await expect(otpService.verify(id, code)).rejects.toMatchObject({ message: 'That code has already been used' });
  });

  it('finds the newest live challenge by purpose and number, or by mailbox', async () => {
    const { code } = await issue();
    await expect(otpService.verifyLatest('ATTENDANCE', { phone_extension: '91', phone_number: '98765 43210' }, code)).resolves.toBeDefined();
    const mail = await otpService.request({ purpose: 'PASSWORD_RESET', mediums: ['EMAIL'], email: 'Asha@Example.com' });
    expect(mail.challenge_id).toBeDefined();
    await expect(otpService.verifyLatest('PASSWORD_RESET', { email: 'asha@example.com' }, lastCode())).resolves.toBeDefined();
  });

  it('says the request expired when nothing live matches, and refuses a target it cannot read', async () => {
    await expect(otpService.verifyLatest('ATTENDANCE', PHONE, '123456')).rejects.toMatchObject({ message: 'That code request has expired — send a new one' });
    await expect(otpService.verifyLatest('PASSWORD_RESET', { email: 'nope' }, '123456')).rejects.toMatchObject({ message: 'Enter a valid email address' });
    await expect(otpService.verifyLatest('ATTENDANCE', { phone_number: '12' }, '123456')).rejects.toMatchObject({ message: expect.stringMatching(/Country code|valid phone/) });
  });

  describe('a code MSG91 made', () => {
    const smsChallenge = async () => {
      deliver.mockImplementation(async ({ medium }: { medium: string }) => sentBy(medium, { request_id: 'req-9' }));
      const out = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['SMS'], ...PHONE });
      return out.challenge_id;
    };

    it('is checked with MSG91 when our own hash does not match', async () => {
      const id = await smsChallenge();
      (runtimeMsg91Credentials as jest.Mock).mockResolvedValue({ authkey: 'k' });
      (msg91VerifyOtp as jest.Mock).mockResolvedValue({ ok: true, message: 'OTP verified' });
      await expect(otpService.verify(id, '482913')).resolves.toBeDefined();
      expect(msg91VerifyOtp).toHaveBeenCalledWith({ authkey: 'k' }, 'req-9', '482913');
    });

    it('is refused, with MSG91’s reason logged, when MSG91 says it is wrong', async () => {
      const id = await smsChallenge();
      (runtimeMsg91Credentials as jest.Mock).mockResolvedValue({ authkey: 'k' });
      (msg91VerifyOtp as jest.Mock).mockResolvedValue({ ok: false, code: '703', message: 'otp not match' });
      await expect(otpService.verify(id, '482913')).rejects.toThrow(/Incorrect code/);
      expect(logs.server.info).toHaveBeenCalledWith('otp.service', 'codeMatches', expect.objectContaining({ code: '703', reason: 'otp not match' }));
    });

    it('is refused when the SMS provider has no credentials any more', async () => {
      const id = await smsChallenge();
      await expect(otpService.verify(id, '482913')).rejects.toThrow(/Incorrect code/);
      expect(msg91VerifyOtp).not.toHaveBeenCalled();
    });

    it('does not burn a guess when MSG91 itself is unreachable', async () => {
      const id = await smsChallenge();
      (runtimeMsg91Credentials as jest.Mock).mockResolvedValue({ authkey: 'k' });
      (msg91VerifyOtp as jest.Mock).mockRejectedValue(new Error('MSG91 down'));
      await expect(otpService.verify(id, '482913')).rejects.toThrow('MSG91 down');
      expect((await OtpChallengeModel.findById(id).lean())?.attempts).toBe(0);
    });
  });
});

describe('carrying a verified code to the step that spends it', () => {
  const verified = async () => {
    const out = await otpService.request({ purpose: 'PASSWORD_RESET', mediums: ['EMAIL'], email: 'asha@example.com' });
    const doc = await otpService.verify(out.challenge_id, lastCode());
    return doc;
  };

  it('mints a grant of the challenge id and a secret, storing only the secret’s hash, and redeems it once verified', async () => {
    const doc = await verified();
    const token = await otpService.grant(doc);
    const [id, secret] = token.split('.');
    expect(id).toBe(String(doc._id));
    expect((await OtpChallengeModel.findById(id).select('+grant_hash').lean())?.grant_hash).toBe(sha(secret));
    const redeemed = await otpService.redeemGrant(token, 'PASSWORD_RESET');
    expect(String(redeemed._id)).toBe(id);
  });

  it('refuses every grant that is malformed, for another purpose, unverified, spent, expired, forged or tampered with', async () => {
    const gone = 'That verification has expired — start again';
    const doc = await verified();
    const token = await otpService.grant(doc);
    const [id, secret] = token.split('.');
    for (const bad of [undefined, '', 'no-dot', `${id}.`, `.${secret}`, `not-an-id.${secret}`, `${new Types.ObjectId()}.${secret}`, `${id}.wrong-secret`]) {
      await expect(otpService.redeemGrant(bad as string, 'PASSWORD_RESET')).rejects.toMatchObject({ message: gone });
    }
    await expect(otpService.redeemGrant(token, 'ATTENDANCE')).rejects.toMatchObject({ message: gone });
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { grant_hash: 'short' } });
    await expect(otpService.redeemGrant(token, 'PASSWORD_RESET')).rejects.toMatchObject({ message: gone });
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { grant_hash: sha(secret), verified_at: null } });
    await expect(otpService.redeemGrant(token, 'PASSWORD_RESET')).rejects.toMatchObject({ message: gone });
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { verified_at: new Date(), consumed_at: new Date() } });
    await expect(otpService.redeemGrant(token, 'PASSWORD_RESET')).rejects.toMatchObject({ message: gone });
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { consumed_at: null, expires_at: new Date(Date.now() - 1000) } });
    await expect(otpService.redeemGrant(token, 'PASSWORD_RESET')).rejects.toMatchObject({ message: gone });
  });

  it('refuses a challenge that never had a grant minted', async () => {
    const doc = await verified();
    await expect(otpService.redeemGrant(`${doc._id}.anything`, 'PASSWORD_RESET')).rejects.toMatchObject({ message: 'That verification has expired — start again' });
  });

  it('records an already-proven number as a verified challenge with a grant that redeems', async () => {
    const { challenge, token } = await otpService.attest('WHATSAPP_SIGNUP', PHONE, { attested_by: 'TRUECALLER' });
    expect(challenge).toMatchObject({ purpose: 'WHATSAPP_SIGNUP', ...PHONE });
    expect(challenge.verified_at).toBeInstanceOf(Date);
    await expect(otpService.redeemGrant(token, 'WHATSAPP_SIGNUP')).resolves.toBeDefined();
  });
});

describe('consume', () => {
  const verifiedAttendance = async () => {
    const out = await otpService.request({ purpose: 'ATTENDANCE', mediums: ['WHATSAPP'], ...PHONE, context: { pod: 'p1' } });
    await otpService.verify(out.challenge_id, lastCode());
    return out.challenge_id;
  };

  it('spends a verified challenge once, and says it is used the second time', async () => {
    const id = await verifiedAttendance();
    const spent = await otpService.consume(id, { purpose: 'ATTENDANCE' });
    expect(spent.consumed_at).toBeInstanceOf(Date);
    await expect(otpService.consume(id, { purpose: 'ATTENDANCE' })).rejects.toMatchObject({ message: 'That verification has already been used' });
    expect(logs.server.info).toHaveBeenCalledWith('otp.service', 'consume', expect.objectContaining({ purpose: 'ATTENDANCE', challenge_id: id }));
  });

  it('lets only one of two simultaneous spends through', async () => {
    const id = await verifiedAttendance();
    const results = await Promise.allSettled([otpService.consume(id, { purpose: 'ATTENDANCE' }), otpService.consume(id, { purpose: 'ATTENDANCE' })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('reports a spend that lost the race as used, even when the early checks passed', async () => {
    const id = await verifiedAttendance();
    const spy = jest.spyOn(OtpChallengeModel, 'findOneAndUpdate').mockResolvedValueOnce(null as never);
    await expect(otpService.consume(id, { purpose: 'ATTENDANCE' })).rejects.toMatchObject({ message: 'That verification has already been used' });
    spy.mockRestore();
  });

  it('refuses a challenge for another purpose, one that was never verified, one that is unknown or malformed', async () => {
    const id = await verifiedAttendance();
    await expect(otpService.consume(id, { purpose: 'LOGIN' })).rejects.toMatchObject({ message: 'Verify the phone number first' });
    const fresh = await otpService.request({ purpose: 'LOGIN', mediums: ['WHATSAPP'], ...PHONE });
    await expect(otpService.consume(fresh.challenge_id, { purpose: 'LOGIN' })).rejects.toMatchObject({ message: 'Verify the phone number first' });
    await expect(otpService.consume(String(new Types.ObjectId()), { purpose: 'LOGIN' })).rejects.toMatchObject({ message: 'Verify the phone number first' });
    await expect(otpService.consume('not-an-id', { purpose: 'LOGIN' })).rejects.toMatchObject({ message: 'Verify the phone number first' });
  });

  it('refuses a verification that has since expired', async () => {
    const id = await verifiedAttendance();
    await OtpChallengeModel.updateOne({ _id: id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
    await expect(otpService.consume(id, { purpose: 'ATTENDANCE' })).rejects.toMatchObject({ message: 'That verification has expired — verify the number again' });
  });

  it('refuses a verification that was for a different person, and spends nothing', async () => {
    const id = await verifiedAttendance();
    await expect(otpService.consume(id, { purpose: 'ATTENDANCE', match: (c) => (c.context as { pod?: string }).pod === 'other' })).rejects.toMatchObject({ message: 'That verification was for a different person' });
    expect((await OtpChallengeModel.findById(id).lean())?.consumed_at).toBeNull();
    await expect(otpService.consume(id, { purpose: 'ATTENDANCE', match: (c) => (c.context as { pod?: string }).pod === 'p1' })).resolves.toBeDefined();
  });
});
