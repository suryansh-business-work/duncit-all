import crypto from 'node:crypto';
import { envAccessService, maskEmail } from '../../envAccess.service';
import { EnvAccessGrantModel } from '../../envAccess.model';
import { anyDelivered, otpService } from '@modules/platform/otp/otp.service';
import { rootAdminEmail } from '@modules/access/user/user.roles';
import { logs } from '@observability/log';

jest.mock('../../envAccess.model', () => ({ EnvAccessGrantModel: { findOne: jest.fn(), findOneAndUpdate: jest.fn(), deleteOne: jest.fn() } }));
jest.mock('@modules/platform/otp/otp.service', () => ({ anyDelivered: jest.fn(), otpService: { request: jest.fn(), verify: jest.fn(), consume: jest.fn() } }));
jest.mock('@modules/access/user/user.roles', () => ({ rootAdminEmail: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), info: jest.fn() } } }));

const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const ctx = (over: Record<string, unknown> = {}) =>
  ({ user: { id: 'u1' }, req: { headers: { authorization: 'Bearer tok-1' } }, ...over }) as never;
const grantLookup = (value: unknown) => (EnvAccessGrantModel.findOne as jest.Mock).mockReturnValue({ lean: () => Promise.resolve(value) });
const LOCKED = { extensions: { code: 'ENV_LOCKED' } };

beforeEach(() => {
  (rootAdminEmail as jest.Mock).mockReturnValue('admin@duncit.com');
  delete process.env.ENV_ACCESS_TTL_MINUTES;
});

describe('maskEmail', () => {
  it('shows two characters and the domain, nothing for a value that is not an address', () => {
    expect(maskEmail('admin@duncit.com')).toBe('ad***@duncit.com');
    expect(maskEmail('a@x.com')).toBe('a***@x.com');
    expect(maskEmail('not-an-email')).toBe('***');
  });
});

describe('status and require', () => {
  it('is locked for a session with no token, or no signed-in user, without even looking up a grant', async () => {
    await expect(envAccessService.status(ctx({ req: { headers: {} } }))).resolves.toEqual({ unlocked: false, expires_at: null, sent_to: 'ad***@duncit.com' });
    await expect(envAccessService.status(ctx({ user: null }))).resolves.toMatchObject({ unlocked: false });
    await expect(envAccessService.status(ctx({ req: undefined }))).resolves.toMatchObject({ unlocked: false });
    await expect(envAccessService.status(ctx({ req: { headers: { authorization: 'Basic abc' } } }))).resolves.toMatchObject({ unlocked: false });
    expect(EnvAccessGrantModel.findOne).not.toHaveBeenCalled();
    await expect(envAccessService.require(ctx({ req: { headers: {} } }))).rejects.toMatchObject(LOCKED);
  });

  it('is unlocked while the session has a live grant, looked up by the hash of its own token', async () => {
    const expires = new Date('2026-01-01T10:00:00Z');
    grantLookup({ expires_at: expires });
    await expect(envAccessService.status(ctx())).resolves.toEqual({ unlocked: true, expires_at: expires.toISOString(), sent_to: 'ad***@duncit.com' });
    expect(EnvAccessGrantModel.findOne).toHaveBeenCalledWith({ session_hash: sha('tok-1'), expires_at: { $gt: expect.any(Date) } });
    await expect(envAccessService.require(ctx())).resolves.toBeUndefined();
  });

  it('is locked when the grant has lapsed or never existed', async () => {
    grantLookup(null);
    await expect(envAccessService.status(ctx())).resolves.toMatchObject({ unlocked: false, expires_at: null });
    await expect(envAccessService.require(ctx())).rejects.toMatchObject({ message: expect.stringContaining('locked'), ...LOCKED });
  });
});

describe('request', () => {
  const issued = { challenge_id: 'c1', expires_at: '2026-01-01T00:10:00Z', resend_after_seconds: 30, deliveries: [{ medium: 'EMAIL', delivered: true }] };

  it('refuses a session without a token', async () => {
    await expect(envAccessService.request(ctx({ req: { headers: {} } }))).rejects.toMatchObject(LOCKED);
    expect(otpService.request).not.toHaveBeenCalled();
  });

  it('mails a code to the root admin whoever asks, and answers with the challenge and the masked address', async () => {
    (otpService.request as jest.Mock).mockResolvedValue(issued);
    (anyDelivered as jest.Mock).mockReturnValue(true);
    await expect(envAccessService.request(ctx())).resolves.toEqual({
      challenge_id: 'c1', expires_at: '2026-01-01T00:10:00Z', resend_after_seconds: 30, sent_to: 'ad***@duncit.com',
    });
    expect(otpService.request).toHaveBeenCalledWith({
      purpose: 'ENV_ACCESS', mediums: ['EMAIL'], email: 'admin@duncit.com', recipient_name: '', context: { user_id: 'u1' }, requested_by: 'u1',
    });
    expect(logs.server.info).toHaveBeenCalledWith('envAccess.service', 'request', { msg: 'access code sent', user_id: 'u1' });
  });

  it('says so, and logs why, when the code could not be emailed', async () => {
    (otpService.request as jest.Mock).mockResolvedValue({ ...issued, deliveries: [{ reason: 'SMTP down' }, { reason: '' }, { reason: 'bounced' }] });
    (anyDelivered as jest.Mock).mockReturnValue(false);
    await expect(envAccessService.request(ctx())).rejects.toMatchObject({
      message: 'The access code could not be emailed. Check the Email (SMTP) entry and try again.',
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
    expect(logs.server.warn).toHaveBeenCalledWith('envAccess.service', 'request', { msg: 'access code not delivered', reason: 'SMTP down; bounced' });
  });
});

describe('verify', () => {
  beforeEach(() => {
    (otpService.verify as jest.Mock).mockResolvedValue({ _id: 'ch1' });
    (otpService.consume as jest.Mock).mockResolvedValue(undefined);
    (EnvAccessGrantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(undefined);
    grantLookup({ expires_at: new Date('2026-01-01T10:00:00Z') });
  });

  it('refuses a session without a token before checking any code', async () => {
    await expect(envAccessService.verify(ctx({ req: { headers: {} } }), 'c', '1')).rejects.toMatchObject(LOCKED);
    expect(otpService.verify).not.toHaveBeenCalled();
  });

  it('spends the code and unlocks this session for the default thirty minutes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T09:00:00Z'));
    try {
      const out = await envAccessService.verify(ctx(), 'c1', '123456');
      expect(out.unlocked).toBe(true);
      expect(otpService.verify).toHaveBeenCalledWith('c1', '123456');
      const { match, purpose } = (otpService.consume as jest.Mock).mock.calls[0][1];
      expect(purpose).toBe('ENV_ACCESS');
      expect(match({ requested_by: 'u1' })).toBe(true);
      expect(match({ requested_by: 'someone-else' })).toBe(false);
      expect(match({})).toBe(false);
      const [filter, update, options] = (EnvAccessGrantModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(filter).toEqual({ session_hash: sha('tok-1') });
      expect(update.$set).toEqual({ user_id: 'u1', expires_at: new Date('2026-01-01T09:30:00Z') });
      expect(options).toEqual({ upsert: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['60', 60],
    ['240', 240],
    ['241', 30],
    ['0', 30],
    ['-5', 30],
    ['1.5', 30],
    ['soon', 30],
    ['', 30],
  ])('reads ENV_ACCESS_TTL_MINUTES=%p as %i minutes', async (raw, minutes) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T09:00:00Z'));
    try {
      process.env.ENV_ACCESS_TTL_MINUTES = raw;
      await envAccessService.verify(ctx(), 'c1', '1');
      expect((EnvAccessGrantModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set.expires_at).toEqual(new Date(Date.now() + minutes * 60_000));
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not unlock anything when the code is wrong', async () => {
    (otpService.verify as jest.Mock).mockRejectedValue(new Error('Invalid code'));
    await expect(envAccessService.verify(ctx(), 'c1', '000000')).rejects.toThrow('Invalid code');
    expect(EnvAccessGrantModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('lock', () => {
  it('ends the unlock early and reports the new status', async () => {
    grantLookup(null);
    await expect(envAccessService.lock(ctx())).resolves.toMatchObject({ unlocked: false });
    expect(EnvAccessGrantModel.deleteOne).toHaveBeenCalledWith({ session_hash: sha('tok-1') });
  });

  it('does nothing for a session that has no token', async () => {
    await expect(envAccessService.lock(ctx({ req: { headers: {} } }))).resolves.toMatchObject({ unlocked: false });
    expect(EnvAccessGrantModel.deleteOne).not.toHaveBeenCalled();
  });
});
