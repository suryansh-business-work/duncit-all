/**
 * The password and one-time-code sign-in doors of user.auth, against a real
 * database: every refusal (unknown account, Google-only account, wrong
 * password, sealed account, inactive account, portal without the role, wrong
 * or unbound code) and the success path that stamps the login.
 *
 * The OTP service is spied rather than run: what is under test here is what
 * user.auth does with the challenge it is handed — which account it opens,
 * and that the code is only spent by a login that actually happens.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ]),
  );
});

import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';

import { userService } from '../../user.service';
import { UserModel } from '../../user.model';
import { UserRoleModel } from '../../relations';
import { otpService } from '@modules/platform/otp/otp.service';
import { OTP_TTL_MINUTES } from '@modules/platform/otp/otp.constants';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';
import { whatsappAuthService } from '@modules/access/auth-whatsapp/auth-whatsapp.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';

const PASSWORD = 'StrongPass123';
let seq = 0;

async function makeUser(over: Record<string, any> = {}) {
  seq += 1;
  const email = `login${seq}@example.com`;
  const doc = await UserModel.create({
    profile: { first_name: 'Asha', last_name: 'K' },
    auth: { email, password: await bcrypt.hash(PASSWORD, 4), ...(over.auth ?? {}) },
    metadata: { status: 'ACTIVE', ...(over.metadata ?? {}) },
    ...(over.communication ? { communication: over.communication } : {}),
  });
  return { id: String(doc._id), email };
}

/** Run `fn` and hand back the GraphQLError it threw, so code + message can both be asserted. */
async function errorOf(fn: () => Promise<unknown>): Promise<GraphQLError> {
  try {
    await fn();
  } catch (e) {
    return e as GraphQLError;
  }
  throw new Error('expected the call to throw');
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('login (password door)', () => {
  it('refuses an address no account holds with the shared invalid-credentials error', async () => {
    const err = await errorOf(() =>
      userService.login({ email: 'nobody@example.com', password: PASSWORD } as any),
    );
    expect(err.message).toBe('Invalid email or password');
    expect(err.extensions.code).toBe('UNAUTHENTICATED');
  });

  it('tells a password-less (Google-only) account to continue with Google', async () => {
    const { email, id } = await makeUser();
    await UserModel.updateOne({ _id: id }, { $unset: { 'auth.password': '' } });
    const err = await errorOf(() => userService.login({ email, password: PASSWORD } as any));
    expect(err.message).toMatch(/uses Google sign-in/);
    expect(err.extensions.code).toBe('UNAUTHENTICATED');
  });

  it('refuses a wrong password with the same message an unknown address gets', async () => {
    const { email } = await makeUser();
    const err = await errorOf(() => userService.login({ email, password: 'WrongPass999' } as any));
    expect(err.message).toBe('Invalid email or password');
    expect(err.extensions.code).toBe('UNAUTHENTICATED');
  });

  it('refuses a sealed account even with the right password, indistinguishably', async () => {
    const { email, id } = await makeUser();
    lockAccount(id);
    try {
      const err = await errorOf(() => userService.login({ email, password: PASSWORD } as any));
      expect(err.message).toBe('Invalid email or password');
      expect(err.extensions.code).toBe('UNAUTHENTICATED');
    } finally {
      unlockAccount(id);
    }
  });

  it('refuses an account that is not ACTIVE', async () => {
    const { email } = await makeUser({ metadata: { status: 'SUSPENDED' } });
    const err = await errorOf(() => userService.login({ email, password: PASSWORD } as any));
    expect(err.message).toBe('Account is not active');
    expect(err.extensions.code).toBe('FORBIDDEN');
  });

  it('signs in by the WhatsApp number on the PHONE channel and stamps the EMAIL provider', async () => {
    const { id, email } = await makeUser({
      communication: { whatsapp: { extension: '+91', number: '9000000501' } },
    });
    const res = await userService.login({
      channel: 'PHONE',
      phone_extension: '+91',
      phone_number: '9000000501',
      password: PASSWORD,
    } as any);
    expect(res.token).toEqual(expect.any(String));
    expect(res.user.user_id).toBe(id);
    expect(res.user.email).toBe(email);
    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.auth.last_login_provider).toBe('EMAIL');
    expect(stored.auth.last_login_at).toBeInstanceOf(Date);
  });

  it('refuses a console portal the account holds no role for, after the credentials pass', async () => {
    const { email } = await makeUser();
    const err = await errorOf(() =>
      userService.login({ email, password: PASSWORD, portal_key: 'tech' } as any),
    );
    expect(err.message).toMatch(/do not have access to this portal/i);
    expect(err.extensions.code).toBe('FORBIDDEN');
  });
});

describe('requestLoginOtp', () => {
  it('answers an unknown address as unregistered and sends nothing', async () => {
    const request = jest.spyOn(otpService, 'request');
    const res = await userService.requestLoginOtp({ channel: 'EMAIL', email: 'ghost@example.com' });
    expect(res).toMatchObject({ ok: false, registered: false, channel: 'EMAIL', sent: false, test_code: null });
    expect(request).not.toHaveBeenCalled();
  });

  it('answers a sealed account as unregistered too', async () => {
    const { id, email } = await makeUser();
    const request = jest.spyOn(otpService, 'request');
    lockAccount(id);
    try {
      const res = await userService.requestLoginOtp({ channel: 'EMAIL', email });
      expect(res.registered).toBe(false);
      expect(request).not.toHaveBeenCalled();
    } finally {
      unlockAccount(id);
    }
  });

  it('issues a LOGIN code bound to the account and reports the delivery', async () => {
    const { id, email } = await makeUser();
    const request = jest.spyOn(otpService, 'request').mockResolvedValue({
      challenge_id: 'c1',
      expires_at: '2026-10-03T10:10:00.000Z',
      deliveries: [{ medium: 'EMAIL', status: 'SENT' } as any],
      resend_after_seconds: 30,
      test_code: null,
    });
    const res = await userService.requestLoginOtp({ channel: 'EMAIL', email });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'LOGIN',
        mediums: ['EMAIL'],
        email,
        recipient_name: 'Asha',
        context: { user_id: id },
        requested_by: id,
      }),
    );
    expect(res).toEqual({
      ok: true,
      registered: true,
      channel: 'EMAIL',
      expires_at: '2026-10-03T10:10:00.000Z',
      resend_after_seconds: 30,
      expires_in_minutes: OTP_TTL_MINUTES,
      sent: true,
      test_code: null,
    });
  });

  it('reports sent=false and echoes the test code when no medium carried it', async () => {
    const { email } = await makeUser();
    jest.spyOn(otpService, 'request').mockResolvedValue({
      challenge_id: 'c2',
      expires_at: '2026-10-03T10:10:00.000Z',
      deliveries: [{ medium: 'EMAIL', status: 'STUBBED' } as any],
      resend_after_seconds: 30,
      test_code: '123456',
    });
    const res = await userService.requestLoginOtp({ channel: 'EMAIL', email });
    expect(res.sent).toBe(false);
    expect(res.test_code).toBe('123456');
  });
});

describe('loginWithOtp', () => {
  const challengeFor = (userId: string | undefined) =>
    ({ _id: new Types.ObjectId(), context: userId ? { user_id: userId } : {} }) as any;

  it('propagates a wrong/expired code refusal from the OTP service and consumes nothing', async () => {
    const { email } = await makeUser();
    jest
      .spyOn(otpService, 'verifyLatest')
      .mockRejectedValue(new GraphQLError('Invalid or expired code', { extensions: { code: 'BAD_USER_INPUT' } }));
    const consume = jest.spyOn(otpService, 'consume');
    await expect(userService.loginWithOtp({ channel: 'EMAIL', email, otp: '000000' })).rejects.toThrow(
      'Invalid or expired code',
    );
    expect(consume).not.toHaveBeenCalled();
  });

  it('refuses a challenge that names no account', async () => {
    jest.spyOn(otpService, 'verifyLatest').mockResolvedValue(challengeFor(undefined));
    const consume = jest.spyOn(otpService, 'consume');
    const err = await errorOf(() =>
      userService.loginWithOtp({ channel: 'EMAIL', email: 'x@example.com', otp: '111111' }),
    );
    expect(err.message).toBe('Invalid email or password');
    expect(consume).not.toHaveBeenCalled();
  });

  it('refuses a sealed account and leaves the code unspent', async () => {
    const { id, email } = await makeUser();
    jest.spyOn(otpService, 'verifyLatest').mockResolvedValue(challengeFor(id));
    const consume = jest.spyOn(otpService, 'consume');
    lockAccount(id);
    try {
      const err = await errorOf(() => userService.loginWithOtp({ channel: 'EMAIL', email, otp: '111111' }));
      expect(err.extensions.code).toBe('UNAUTHENTICATED');
      expect(consume).not.toHaveBeenCalled();
    } finally {
      unlockAccount(id);
    }
  });

  it('refuses an inactive account and leaves the code unspent', async () => {
    const { id, email } = await makeUser({ metadata: { status: 'INACTIVE' } });
    jest.spyOn(otpService, 'verifyLatest').mockResolvedValue(challengeFor(id));
    const consume = jest.spyOn(otpService, 'consume');
    const err = await errorOf(() => userService.loginWithOtp({ channel: 'EMAIL', email, otp: '111111' }));
    expect(err.message).toBe('Account is not active');
    expect(consume).not.toHaveBeenCalled();
  });

  it('spends the code, stamps the OTP provider and returns a session for the bound account', async () => {
    const { id, email } = await makeUser();
    await UserRoleModel.create({ user_id: id, role: 'USER', scope: { city: null, zone: null } });
    const challenge = challengeFor(id);
    const verify = jest.spyOn(otpService, 'verifyLatest').mockResolvedValue(challenge);
    const consume = jest.spyOn(otpService, 'consume').mockResolvedValue(challenge);

    const res = await userService.loginWithOtp({ channel: 'EMAIL', email, otp: '424242' });

    expect(verify).toHaveBeenCalledWith('LOGIN', { email }, '424242');
    expect(consume).toHaveBeenCalledWith(String(challenge._id), { purpose: 'LOGIN' });
    expect(res.token).toEqual(expect.any(String));
    expect(res.user.user_id).toBe(id);
    expect(res.user.roles).toEqual(['USER']);
    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.auth.last_login_provider).toBe('OTP');
  });
});

describe('register (the branches the main suite does not reach)', () => {
  const proof = { _id: new Types.ObjectId() } as any;
  let phoneSeq = 0;
  const input = (over: Record<string, any> = {}) => {
    phoneSeq += 1;
    return {
      first_name: 'Rhea',
      last_name: 'D',
      email: `register${phoneSeq}@example.com`,
      password: PASSWORD,
      phone_extension: '+91',
      phone_number: String(9000000900 + phoneSeq),
      whatsapp_token: 'wa-proof',
      dob: '1993-03-03T00:00:00.000Z',
      ...over,
    } as any;
  };

  let redeem: jest.SpyInstance;
  beforeEach(() => {
    redeem = jest.spyOn(whatsappAuthService, 'redeemSignupProof').mockResolvedValue(proof);
    jest.spyOn(whatsappAuthService, 'spendSignupProof').mockResolvedValue(undefined);
    jest.spyOn(whatsappService, 'send').mockResolvedValue(undefined as never);
  });

  it('refuses a placeholder number before anything else', async () => {
    const err = await errorOf(() => userService.register(input({ phone_number: '0000000000' })));
    expect(err.message).toBe('Invalid phone number');
    expect(redeem).not.toHaveBeenCalled();
  });

  it('records only the WhatsApp number when the person says it is not also their mobile', async () => {
    const data = input({ whatsapp_is_mobile: false });
    const res = await userService.register(data);
    const stored = await UserModel.findById(res.user.user_id).lean<any>();
    expect(stored.auth.phone).toBeUndefined();
    expect(stored.communication.whatsapp).toMatchObject({ extension: '+91', number: data.phone_number });
    expect(stored.communication.whatsapp.verified_at).toBeInstanceOf(Date);
  });

  it('maps a duplicate-key race on the phone onto the friendly CONFLICT', async () => {
    jest
      .spyOn(UserModel, 'create')
      .mockRejectedValueOnce(Object.assign(new Error('E11000'), { code: 11000, keyPattern: { 'auth.phone.number': 1 } }));
    const err = await errorOf(() => userService.register(input()));
    expect(err.message).toMatch(/phone number is already registered/);
    expect(err.extensions.code).toBe('CONFLICT');
  });

  it('rethrows any other failure while creating the account', async () => {
    const boom = new Error('disk full');
    jest.spyOn(UserModel, 'create').mockRejectedValueOnce(boom);
    await expect(userService.register(input())).rejects.toBe(boom);
  });
});
