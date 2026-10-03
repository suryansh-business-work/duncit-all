/**
 * The Google / Apple doors of user.auth against a real database: provider
 * sign-in, the consent-step link, Profile > Connected Accounts, and social
 * signup.
 *
 * The provider token checks are mocked (no network); everything they return is
 * fed through the real account code. Signup runs inside
 * `session.withTransaction`, which the standalone test mongod cannot host, so
 * the session is a real one whose withTransaction simply runs the callback —
 * every query still carries the session exactly as in production.
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
jest.mock('@modules/access/auth/auth.google', () => ({ verifyGoogleIdToken: jest.fn() }));
jest.mock('@modules/access/auth/auth.apple', () => ({
  ...jest.requireActual('@modules/access/auth/auth.apple'),
  verifyAppleIdToken: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';

import { userService } from '../../user.service';
import { UserModel } from '../../user.model';
import { UserRoleModel } from '../../relations';
import { verifyGoogleIdToken } from '@modules/access/auth/auth.google';
import { verifyAppleIdToken } from '@modules/access/auth/auth.apple';
import { whatsappAuthService } from '@modules/access/auth-whatsapp/auth-whatsapp.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';

const googleVerify = verifyGoogleIdToken as jest.Mock;
const appleVerify = verifyAppleIdToken as jest.Mock;
const PASSWORD = 'StrongPass123';
let seq = 0;

async function makeUser(over: { auth?: Record<string, any>; metadata?: Record<string, any>; profile?: Record<string, any>; noPassword?: boolean } = {}) {
  seq += 1;
  const email = `social${seq}@example.com`;
  const doc = await UserModel.create({
    profile: { first_name: 'Kiran', last_name: 'M', ...(over.profile ?? {}) },
    auth: {
      email,
      ...(over.noPassword ? {} : { password: await bcrypt.hash(PASSWORD, 4) }),
      ...(over.auth ?? {}),
    },
    metadata: { status: 'ACTIVE', ...(over.metadata ?? {}) },
  });
  return { id: String(doc._id), email };
}

async function errorOf(fn: () => Promise<unknown>): Promise<GraphQLError> {
  try {
    await fn();
  } catch (e) {
    return e as GraphQLError;
  }
  throw new Error('expected the call to throw');
}

/** A real session whose transaction wrapper just runs the work (standalone mongod). */
function sessionsWithoutTransactions(runCallback = true) {
  const realStart = UserModel.db.startSession.bind(UserModel.db);
  return jest.spyOn(UserModel.db, 'startSession').mockImplementation((async (opts?: any) => {
    const session = await realStart(opts);
    (session as any).withTransaction = async (fn: (s: unknown) => Promise<unknown>) => {
      if (runCallback) await fn(session);
    };
    return session;
  }) as any);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('loginWithGoogle / loginWithApple', () => {
  it('signs in a linked account, verifies its email and takes the provider photo when it has none', async () => {
    const { id, email } = await makeUser({ auth: { google_id: 'g-1', is_email_verified: false } });
    googleVerify.mockResolvedValue({ sub: 'g-1', email: email.toUpperCase(), picture: 'https://img.example.com/p.png' });

    const res = await userService.loginWithGoogle('id-token');

    expect(googleVerify).toHaveBeenCalledWith('id-token');
    expect(res.user.user_id).toBe(id);
    expect(res.token).toEqual(expect.any(String));
    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.auth.is_email_verified).toBe(true);
    expect(stored.profile.profile_photo).toBe('https://img.example.com/p.png');
    expect(stored.auth.last_login_provider).toBe('GOOGLE');
  });

  it('keeps an existing photo and stamps APPLE for an Apple-linked account', async () => {
    const { id, email } = await makeUser({
      auth: { apple_id: 'a-1', is_email_verified: true },
      profile: { profile_photo: 'https://img.example.com/own.png' },
    });
    appleVerify.mockResolvedValue({ sub: 'a-1', email, picture: 'https://img.example.com/apple.png' });

    await userService.loginWithApple('apple-token');

    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.profile.profile_photo).toBe('https://img.example.com/own.png');
    expect(stored.auth.last_login_provider).toBe('APPLE');
  });

  it('offers linking (EMAIL_LOGIN_REQUIRED) when the verified address holds a password account', async () => {
    const { email } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-new', email });
    const err = await errorOf(() => userService.loginWithGoogle('t'));
    expect(err.extensions.code).toBe('EMAIL_LOGIN_REQUIRED');
    expect(err.extensions.email).toBe(email);
  });

  it('answers a sealed password account as unknown rather than offering the link', async () => {
    const { id, email } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-new', email });
    lockAccount(id);
    try {
      const err = await errorOf(() => userService.loginWithGoogle('t'));
      expect(err.extensions.code).toBe('GOOGLE_ACCOUNT_NOT_FOUND');
    } finally {
      unlockAccount(id);
    }
  });

  it('answers an identity nobody holds with the provider not-found code', async () => {
    appleVerify.mockResolvedValue({ sub: 'a-nobody', email: 'nobody@example.com' });
    const err = await errorOf(() => userService.loginWithApple('t'));
    expect(err.message).toBe('User is not in our system. Please sign up first.');
    expect(err.extensions.code).toBe('APPLE_ACCOUNT_NOT_FOUND');
    expect(err.extensions.email).toBe('nobody@example.com');
  });

  it('answers a sealed linked account exactly as an unknown one', async () => {
    const { id, email } = await makeUser({ auth: { google_id: 'g-sealed' } });
    googleVerify.mockResolvedValue({ sub: 'g-sealed', email });
    lockAccount(id);
    try {
      const err = await errorOf(() => userService.loginWithGoogle('t'));
      expect(err.extensions.code).toBe('GOOGLE_ACCOUNT_NOT_FOUND');
    } finally {
      unlockAccount(id);
    }
  });

  it('refuses an inactive linked account', async () => {
    const { email } = await makeUser({ auth: { google_id: 'g-off' }, metadata: { status: 'SUSPENDED' } });
    googleVerify.mockResolvedValue({ sub: 'g-off', email });
    const err = await errorOf(() => userService.loginWithGoogle('t'));
    expect(err.message).toBe('Account is not active');
    expect(err.extensions.code).toBe('FORBIDDEN');
  });

  it('refuses a console portal the linked account has no role for', async () => {
    const { email } = await makeUser({ auth: { google_id: 'g-portal' } });
    googleVerify.mockResolvedValue({ sub: 'g-portal', email });
    const err = await errorOf(() => userService.loginWithGoogle('t', 'tech'));
    expect(err.extensions.code).toBe('FORBIDDEN');
  });

  it('propagates a rejected provider token', async () => {
    googleVerify.mockRejectedValue(new GraphQLError('Invalid Google token', { extensions: { code: 'UNAUTHENTICATED' } }));
    await expect(userService.loginWithGoogle('bad')).rejects.toThrow('Invalid Google token');
  });
});

describe('linkGoogleAccount / linkAppleAccount', () => {
  it('links the provider to the password account and keeps the password', async () => {
    const { id, email } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-link', email, picture: 'https://img.example.com/g.png' });

    const res = await userService.linkGoogleAccount('t');

    expect(res.user.user_id).toBe(id);
    const stored = await UserModel.findById(id).select('+auth.password').lean<any>();
    expect(stored.auth.google_id).toBe('g-link');
    expect(stored.auth.google_email).toBe(email);
    expect(stored.auth.google_linked_at).toBeInstanceOf(Date);
    expect(stored.auth.is_email_verified).toBe(true);
    expect(stored.auth.last_login_provider).toBe('GOOGLE');
    expect(stored.profile.profile_photo).toBe('https://img.example.com/g.png');
    expect(await bcrypt.compare(PASSWORD, stored.auth.password)).toBe(true);
  });

  it('treats a repeat link of an already-linked identity as a plain sign-in', async () => {
    const { id, email } = await makeUser({ auth: { apple_id: 'a-twice' } });
    appleVerify.mockResolvedValue({ sub: 'a-twice', email });
    const res = await userService.linkAppleAccount('t');
    expect(res.user.user_id).toBe(id);
    expect((await UserModel.findById(id).lean<any>()).auth.last_login_provider).toBe('APPLE');
  });

  it('answers an address with no account as not found', async () => {
    googleVerify.mockResolvedValue({ sub: 'g-x', email: 'missing@example.com' });
    const err = await errorOf(() => userService.linkGoogleAccount('t'));
    expect(err.extensions.code).toBe('GOOGLE_ACCOUNT_NOT_FOUND');
  });

  it('answers a sealed account as not found and writes nothing', async () => {
    const { id, email } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-sealed-link', email });
    lockAccount(id);
    try {
      const err = await errorOf(() => userService.linkGoogleAccount('t'));
      expect(err.extensions.code).toBe('GOOGLE_ACCOUNT_NOT_FOUND');
      expect((await UserModel.findById(id).lean<any>()).auth.google_id).toBeUndefined();
    } finally {
      unlockAccount(id);
    }
  });

  it('refuses an inactive account', async () => {
    const { email } = await makeUser({ metadata: { status: 'INACTIVE' } });
    googleVerify.mockResolvedValue({ sub: 'g-inactive', email });
    const err = await errorOf(() => userService.linkGoogleAccount('t'));
    expect(err.extensions.code).toBe('FORBIDDEN');
  });

  it('refuses an account already linked to a DIFFERENT identity of that provider', async () => {
    const { id, email } = await makeUser({ auth: { apple_id: 'a-original' } });
    appleVerify.mockResolvedValue({ sub: 'a-other', email });
    const err = await errorOf(() => userService.linkAppleAccount('t'));
    expect(err.message).toBe('This account is already linked to a different Apple ID.');
    expect(err.extensions.code).toBe('CONFLICT');
    expect((await UserModel.findById(id).lean<any>()).auth.apple_id).toBe('a-original');
  });
});

describe('Connected Accounts', () => {
  it('myConnectedAccounts refuses an unknown user', async () => {
    const err = await errorOf(() => userService.myConnectedAccounts(new Types.ObjectId().toString()));
    expect(err.extensions.code).toBe('NOT_FOUND');
  });

  it('myConnectedAccounts reports the password and no Google link', async () => {
    const { id, email } = await makeUser();
    expect(await userService.myConnectedAccounts(id)).toEqual({
      email,
      has_password: true,
      google: null,
      password_changed_at: null,
      last_login_at: null,
      last_login_provider: null,
    });
  });

  it('myConnectedAccounts reports when the password changed and the last sign-in', async () => {
    const { id } = await makeUser();
    const changedAt = new Date('2026-09-01T10:00:00.000Z');
    const loginAt = new Date('2026-10-02T08:30:00.000Z');
    await UserModel.updateOne(
      { _id: id },
      {
        $set: {
          'security.password_changed_at': changedAt,
          'auth.last_login_at': loginAt,
          'auth.last_login_provider': 'GOOGLE',
        },
      }
    );
    const res = await userService.myConnectedAccounts(id);
    expect(res.password_changed_at).toBe(changedAt.toISOString());
    expect(res.last_login_at).toBe(loginAt.toISOString());
    expect(res.last_login_provider).toBe('GOOGLE');
  });

  it('myConnectedAccounts falls back to the account email for a legacy Google signup', async () => {
    const { id, email } = await makeUser({ noPassword: true, auth: { google_id: 'g-legacy' } });
    const res = await userService.myConnectedAccounts(id);
    expect(res.has_password).toBe(false);
    expect(res.google).toEqual({ google_email: email, linked_at: null });
  });

  it('connectGoogleAccount refuses an unknown user', async () => {
    googleVerify.mockResolvedValue({ sub: 'g-c', email: 'x@example.com' });
    const err = await errorOf(() => userService.connectGoogleAccount(new Types.ObjectId().toString(), 't'));
    expect(err.extensions.code).toBe('NOT_FOUND');
  });

  it('connectGoogleAccount is a no-op for the identity already connected', async () => {
    const linkedAt = new Date('2026-01-02T03:04:05.000Z');
    const { id } = await makeUser({ auth: { google_id: 'g-same', google_email: 'mine@example.com', google_linked_at: linkedAt } });
    googleVerify.mockResolvedValue({ sub: 'g-same', email: 'mine@example.com' });
    const res = await userService.connectGoogleAccount(id, 't');
    expect(res.google).toEqual({ google_email: 'mine@example.com', linked_at: linkedAt.toISOString() });
  });

  it('connectGoogleAccount refuses when a different Google account is already connected', async () => {
    const { id } = await makeUser({ auth: { google_id: 'g-first' } });
    googleVerify.mockResolvedValue({ sub: 'g-second', email: 'second@example.com' });
    const err = await errorOf(() => userService.connectGoogleAccount(id, 't'));
    expect(err.message).toMatch(/already connected\. Disconnect it/);
    expect(err.extensions.code).toBe('CONFLICT');
  });

  it('connectGoogleAccount refuses a Google identity linked to another Duncit account', async () => {
    await makeUser({ auth: { google_id: 'g-taken' } });
    const { id } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-taken', email: 'taken@example.com' });
    const err = await errorOf(() => userService.connectGoogleAccount(id, 't'));
    expect(err.message).toBe('This Google account is already connected to another Duncit account.');
    expect((await UserModel.findById(id).lean<any>()).auth.google_id).toBeUndefined();
  });

  it('connectGoogleAccount links a Gmail that differs from the account email, lower-cased', async () => {
    const { id, email } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-fresh', email: 'Other.Gmail@Example.com' });
    const res = await userService.connectGoogleAccount(id, 't');
    expect(res.email).toBe(email);
    expect(res.has_password).toBe(true);
    expect(res.google?.google_email).toBe('other.gmail@example.com');
    expect(res.google?.linked_at).toEqual(expect.any(String));
  });

  it('disconnectGoogleAccount refuses an unknown user', async () => {
    const err = await errorOf(() => userService.disconnectGoogleAccount(new Types.ObjectId().toString()));
    expect(err.extensions.code).toBe('NOT_FOUND');
  });

  it('disconnectGoogleAccount refuses when nothing is connected', async () => {
    const { id } = await makeUser();
    const err = await errorOf(() => userService.disconnectGoogleAccount(id));
    expect(err.extensions.code).toBe('BAD_USER_INPUT');
  });

  it('disconnectGoogleAccount refuses when Google is the only way in', async () => {
    const { id } = await makeUser({ noPassword: true, auth: { google_id: 'g-only' } });
    const err = await errorOf(() => userService.disconnectGoogleAccount(id));
    expect(err.extensions.code).toBe('FORBIDDEN');
    expect((await UserModel.findById(id).lean<any>()).auth.google_id).toBe('g-only');
  });

  it('disconnectGoogleAccount unlinks and points the last-login marker back at EMAIL', async () => {
    const { id } = await makeUser({
      auth: { google_id: 'g-bye', google_email: 'bye@example.com', last_login_provider: 'GOOGLE' },
    });
    const res = await userService.disconnectGoogleAccount(id);
    expect(res.google).toBeNull();
    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.auth.google_id).toBeUndefined();
    expect(stored.auth.google_email).toBeUndefined();
    expect(stored.auth.last_login_provider).toBe('EMAIL');
  });
});

describe('signupWithGoogle / signupWithApple', () => {
  let phoneSeq = 0;
  const proof = { _id: new Types.ObjectId() } as any;
  const signupInput = (over: Record<string, any> = {}) => {
    phoneSeq += 1;
    return {
      id_token: 'tok',
      whatsapp_token: 'wa-proof',
      phone_extension: '+91',
      phone_number: String(9000000700 + phoneSeq),
      dob: '1994-05-06T00:00:00.000Z',
      ...over,
    } as any;
  };

  let redeem: jest.SpyInstance;
  let spend: jest.SpyInstance;
  beforeEach(() => {
    redeem = jest.spyOn(whatsappAuthService, 'redeemSignupProof').mockResolvedValue(proof);
    spend = jest.spyOn(whatsappAuthService, 'spendSignupProof').mockResolvedValue(undefined);
    jest.spyOn(whatsappService, 'send').mockResolvedValue(undefined as never);
    sessionsWithoutTransactions();
  });

  it('refuses a placeholder phone number before redeeming the proof', async () => {
    googleVerify.mockResolvedValue({ sub: 'g-s0', email: 'p0@example.com' });
    const err = await errorOf(() => userService.signupWithGoogle(signupInput({ phone_number: '0000000000' })));
    expect(err.extensions.code).toBe('BAD_USER_INPUT');
    expect(redeem).not.toHaveBeenCalled();
  });

  it('creates a Google account with the id linked, the WhatsApp number proven and only that number', async () => {
    googleVerify.mockResolvedValue({
      sub: 'g-s1',
      email: 'New.Person@Example.com',
      given_name: 'Neha',
      family_name: 'Rao',
      picture: 'https://img.example.com/n.png',
    });
    const input = signupInput({ whatsapp_is_mobile: false });

    const res = await userService.signupWithGoogle(input);

    expect(redeem).toHaveBeenCalledWith('wa-proof', '+91', input.phone_number);
    expect(spend).toHaveBeenCalledWith(proof);
    expect(res.token).toEqual(expect.any(String));
    expect(res.user.first_name).toBe('Neha');
    expect(res.user.last_name).toBe('Rao');
    const stored = await UserModel.findById(res.user.user_id).lean<any>();
    expect(stored.auth.email).toBe('new.person@example.com');
    expect(stored.auth.google_id).toBe('g-s1');
    expect(stored.auth.is_email_verified).toBe(true);
    expect(stored.auth.phone).toBeUndefined();
    expect(stored.communication.whatsapp.number).toBe(input.phone_number);
    expect(stored.communication.whatsapp.verified_at).toBeInstanceOf(Date);
    expect(stored.profile.profile_photo).toBe('https://img.example.com/n.png');
    expect(stored.auth.last_login_provider).toBe('GOOGLE');
    const roles = await UserRoleModel.find({ user_id: stored._id }).lean();
    expect(roles.map((r: any) => r.role)).toEqual(['USER']);
  });

  it('creates an Apple account under the name the client sent, with the number as mobile too', async () => {
    appleVerify.mockResolvedValue({ sub: 'a-s1', email: 'apple1@example.com' });
    const input = signupInput({ first_name: '  Arjun ', last_name: ' Sen ' });

    const res = await userService.signupWithApple(input);

    const stored = await UserModel.findById(res.user.user_id).lean<any>();
    expect(stored.profile.first_name).toBe('Arjun');
    expect(stored.profile.last_name).toBe('Sen');
    expect(stored.auth.apple_id).toBe('a-s1');
    expect(stored.auth.google_id).toBeUndefined();
    expect(stored.auth.phone).toMatchObject({ number: input.phone_number, extension: '+91', is_verified: true });
    expect(stored.auth.last_login_provider).toBe('APPLE');
  });

  it('splits the provider full name when no given/family name is present', async () => {
    googleVerify.mockResolvedValue({ sub: 'g-s2', email: 'full@example.com', name: 'Ravi Kumar Das' });
    const res = await userService.signupWithGoogle(signupInput());
    expect(res.user.first_name).toBe('Ravi');
    expect(res.user.last_name).toBe('Kumar Das');
  });

  it('falls back to the provider label and "User" when the token carries no name at all', async () => {
    appleVerify.mockResolvedValue({ sub: 'a-s2', email: 'anon@example.com' });
    const res = await userService.signupWithApple(signupInput());
    expect(res.user.first_name).toBe('Apple');
    expect(res.user.last_name).toBe('User');
  });

  it('tells an existing password account to log in with email', async () => {
    const { email } = await makeUser();
    googleVerify.mockResolvedValue({ sub: 'g-s3', email });
    const err = await errorOf(() => userService.signupWithGoogle(signupInput()));
    expect(err.message).toBe('Please login with email. You registered using email and password.');
    expect(err.extensions.code).toBe('CONFLICT');
  });

  it('tells an existing provider-only account to log in with the provider', async () => {
    await makeUser({ noPassword: true, auth: { google_id: 'g-s4' } });
    googleVerify.mockResolvedValue({ sub: 'g-s4', email: 'different@example.com' });
    const err = await errorOf(() => userService.signupWithGoogle(signupInput()));
    expect(err.message).toBe('Google account already exists. Please login with Google.');
  });

  it('refuses a number another account already holds as its WhatsApp number', async () => {
    const input = signupInput();
    await UserModel.create({
      profile: { first_name: 'Owner' },
      auth: { email: `owner${phoneSeq}@example.com` },
      communication: { whatsapp: { extension: '+91', number: input.phone_number } },
    });
    googleVerify.mockResolvedValue({ sub: 'g-s5', email: 'fresh5@example.com' });
    const err = await errorOf(() => userService.signupWithGoogle(input));
    expect(err.message).toMatch(/phone number is already registered/);
    expect(await UserModel.countDocuments({ 'auth.google_id': 'g-s5' })).toBe(0);
  });

  it.each([
    [{ 'auth.phone.number': 1 }, /phone number is already registered/],
    [{ 'auth.email': 1 }, /^Account already exists\. Please login instead\.$/],
    [{ 'auth.apple_id': 1 }, /^Account already exists\. Please login instead\.$/],
    [{ 'profile.username': 1 }, /^Account already exists$/],
  ])('maps a duplicate-key race on %j onto a CONFLICT', async (keyPattern, message) => {
    appleVerify.mockResolvedValue({ sub: `a-race-${Object.keys(keyPattern)[0]}`, email: 'race@example.com' });
    jest.spyOn(UserModel, 'create').mockRejectedValueOnce(Object.assign(new Error('E11000'), { code: 11000, keyPattern }));
    const err = await errorOf(() => userService.signupWithApple(signupInput()));
    expect(err).toBeInstanceOf(GraphQLError);
    expect(err.message).toMatch(message);
    expect(err.extensions.code).toBe('CONFLICT');
  });

  it('rethrows a non-duplicate failure untouched', async () => {
    googleVerify.mockResolvedValue({ sub: 'g-boom', email: 'boom@example.com' });
    const boom = new Error('disk full');
    jest.spyOn(UserModel, 'create').mockRejectedValueOnce(boom);
    await expect(userService.signupWithGoogle(signupInput())).rejects.toBe(boom);
  });

  it('fails loudly when the transaction finished without creating the account', async () => {
    jest.restoreAllMocks();
    jest.spyOn(whatsappAuthService, 'redeemSignupProof').mockResolvedValue(proof);
    jest.spyOn(whatsappAuthService, 'spendSignupProof').mockResolvedValue(undefined);
    sessionsWithoutTransactions(false);
    googleVerify.mockResolvedValue({ sub: 'g-none', email: 'none@example.com' });
    const err = await errorOf(() => userService.signupWithGoogle(signupInput()));
    expect(err.message).toBe('Could not create Google account');
    expect(err.extensions.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
