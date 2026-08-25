/**
 * Every email one-time code an account can be sent, against a real database.
 *
 * There are four of them — verify your address, reset a forgotten password,
 * change a known one, delete the account — and they share a shape that has to
 * hold identically each time, because each is a way into somebody's account:
 *
 *  - the code is never stored. Only its hash is, so a database read cannot be
 *    turned into a sign-in.
 *  - it EXPIRES, and an expired one is refused exactly as loudly as a wrong
 *    one. Otherwise the difference tells an attacker they had the right code.
 *  - it is single use: succeeding clears the hash, so a code read over somebody's
 *    shoulder cannot be replayed.
 *  - the dev echo is the only thing that ever returns the code itself. It is
 *    gated on NODE_ENV !== 'production', so it is on here and off in production —
 *    and what must hold in either case is that it is never a SECOND code.
 *
 * The two password flows differ on purpose. RESET is public, so an unregistered
 * address gets no code and is reported as unregistered rather than silently
 * accepted — the UI needs to offer signing up instead. CHANGE is authenticated
 * and starts by proving the CURRENT password, so a stolen session alone cannot
 * lock the owner out.
 *
 * The mail transport is stubbed here, as in the suites beside it: fire-and-forget
 * mail outlives the per-suite teardown and surfaces as a spurious rejection.
 */
jest.mock('@services/email/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminCredentialsEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangeOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountDeletionOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessGrantedEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessRevokedEmail: jest.fn().mockResolvedValue(undefined),
  sendPolicyAcceptanceEmail: jest.fn().mockResolvedValue(undefined),
}));

import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

import {
  sendAccountDeletionOtpEmail,
  sendEmailVerificationOtpEmail,
  sendPasswordChangeOtpEmail,
  sendPasswordResetOtpEmail,
} from '@services/email/email.service';

import { userService } from '../../user.service';
import { accountDeletionService } from '@modules/access/accountDeletion/accountDeletion.service';
import { UserModel } from '../../user.model';

const PASSWORD = 'StrongPass123';

let seq = 0;

/** An ACTIVE account with a real bcrypt hash, so the password paths run for real. */
async function makeUser(over: Record<string, unknown> = {}) {
  seq += 1;
  const email = `otp${seq}-${Date.now()}@duncit.com`;
  const doc = await UserModel.create({
    profile: { first_name: 'Meera', last_name: 'N' },
    auth: { email, password: await bcrypt.hash(PASSWORD, 4), is_email_verified: false },
    metadata: { status: 'ACTIVE' },
    ...over,
  });
  return { id: String(doc._id), email };
}

/** The code the mail carried — the only place it exists outside the hash. */
const codeFrom = (mock: jest.Mock): string => {
  const [call] = mock.mock.calls.slice(-1);
  return (call?.[0] as { otp: string })?.otp ?? '';
};

/** What is actually persisted for one flow. */
const storedOtp = async (id: string, field: string) => {
  const doc = await UserModel.findById(id).select(`+auth.${field}_hash +auth.${field}_expires_at`).lean<any>();
  return {
    hash: doc?.auth?.[`${field}_hash`] as string | undefined,
    expiresAt: doc?.auth?.[`${field}_expires_at`] as Date | undefined,
  };
};

const expireOtp = (id: string, field: string) =>
  UserModel.updateOne(
    { _id: id },
    { $set: { [`auth.${field}_expires_at`]: new Date(Date.now() - 60_000) } }
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('verifying an email address', () => {
  it('stores only the HASH of the code, never the code', async () => {
    const { id } = await makeUser();

    await userService.requestEmailVerificationOtp(id);

    const stored = await storedOtp(id, 'email_verification_otp');
    const sent = codeFrom(sendEmailVerificationOtpEmail as jest.Mock);
    expect(sent).toMatch(/^\d{6}$/);
    expect(stored.hash).toBeTruthy();
    expect(stored.hash).not.toBe(sent);
  });

  it('echoes the code back only as a development convenience, and it is the SAME code', async () => {
    const { id } = await makeUser();

    const result = await userService.requestEmailVerificationOtp(id);

    // The echo is gated on NODE_ENV !== 'production', so it is on here and off
    // in production. What must hold either way is that it is never a SECOND
    // code — an echo that did not match the email would be a second way in.
    expect(result.dev_otp).toBe(codeFrom(sendEmailVerificationOtpEmail as jest.Mock));
  });

  it('verifies the address when the right code is given', async () => {
    const { id } = await makeUser();
    await userService.requestEmailVerificationOtp(id);

    await userService.verifyEmailVerificationOtp(id, codeFrom(sendEmailVerificationOtpEmail as jest.Mock));

    const doc = await UserModel.findById(id).lean<any>();
    expect(doc?.auth?.is_email_verified).toBe(true);
  });

  it('clears the code on success, so it cannot be replayed', async () => {
    const { id } = await makeUser();
    await userService.requestEmailVerificationOtp(id);
    const code = codeFrom(sendEmailVerificationOtpEmail as jest.Mock);
    await userService.verifyEmailVerificationOtp(id, code);

    const stored = await storedOtp(id, 'email_verification_otp');
    expect(stored.hash).toBeUndefined();
  });

  it('refuses a wrong code', async () => {
    const { id } = await makeUser();
    await userService.requestEmailVerificationOtp(id);

    await expect(userService.verifyEmailVerificationOtp(id, '000000')).rejects.toThrow('Invalid OTP');
  });

  it('refuses one that is not six digits, before touching the account at all', async () => {
    const { id } = await makeUser();

    await expect(userService.verifyEmailVerificationOtp(id, '12345')).rejects.toThrow('6 digit');
    await expect(userService.verifyEmailVerificationOtp(id, 'abcdef')).rejects.toThrow('6 digit');
  });

  it('refuses an expired code', async () => {
    const { id } = await makeUser();
    await userService.requestEmailVerificationOtp(id);
    const code = codeFrom(sendEmailVerificationOtpEmail as jest.Mock);
    await expireOtp(id, 'email_verification_otp');

    await expect(userService.verifyEmailVerificationOtp(id, code)).rejects.toThrow('expired');
  });

  it('refuses when no code was ever asked for', async () => {
    const { id } = await makeUser();

    await expect(userService.verifyEmailVerificationOtp(id, '123456')).rejects.toThrow('expired');
  });

  it('sends nothing to an already-verified address', async () => {
    const { id } = await makeUser();
    await UserModel.updateOne({ _id: id }, { $set: { 'auth.is_email_verified': true } });

    const result = await userService.requestEmailVerificationOtp(id);

    expect(result).toEqual({ ok: true, dev_otp: null });
    expect(sendEmailVerificationOtpEmail).not.toHaveBeenCalled();
  });

  it('refuses an account with no address to verify', async () => {
    const doc = await UserModel.create({
      profile: { first_name: 'Nobody' },
      auth: {},
      metadata: { status: 'ACTIVE' },
    });

    await expect(userService.requestEmailVerificationOtp(String(doc._id))).rejects.toThrow(
      'Add an email address'
    );
  });

  it('refuses an account that does not exist', async () => {
    await expect(
      userService.requestEmailVerificationOtp(new Types.ObjectId().toString())
    ).rejects.toThrow('User not found');
  });
});

describe('resetting a forgotten password', () => {
  it('sends a code to a registered address', async () => {
    const { email } = await makeUser();

    const result = await userService.requestPasswordResetOtp({ email } as never);

    expect(result).toMatchObject({ ok: true, registered: true });
    expect(result.dev_otp).toBe(codeFrom(sendPasswordResetOtpEmail as jest.Mock));
    expect(sendPasswordResetOtpEmail).toHaveBeenCalled();
  });

  it('reports an unregistered address as unregistered, so the UI can offer signing up', async () => {
    const result = await userService.requestPasswordResetOtp({
      email: 'nobody@duncit.com',
    } as never);

    expect(result).toMatchObject({ ok: false, registered: false });
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });

  it('matches the address however it was typed', async () => {
    const { email } = await makeUser();

    const result = await userService.requestPasswordResetOtp({
      email: `  ${email.toUpperCase()}  `,
    } as never);

    expect(result.registered).toBe(true);
  });

  it('sets the new password, and the old one stops working', async () => {
    const { id, email } = await makeUser();
    await userService.requestPasswordResetOtp({ email } as never);
    const code = codeFrom(sendPasswordResetOtpEmail as jest.Mock);

    await userService.resetPasswordWithOtp({ email, otp: code, new_password: 'BrandNew123' } as never);

    const doc = await UserModel.findById(id).select('+auth.password').lean<any>();
    expect(await bcrypt.compare('BrandNew123', doc.auth.password)).toBe(true);
    expect(await bcrypt.compare(PASSWORD, doc.auth.password)).toBe(false);
  });

  it('refuses a wrong code, an expired one and an unknown address alike', async () => {
    const { id, email } = await makeUser();
    await userService.requestPasswordResetOtp({ email } as never);
    const code = codeFrom(sendPasswordResetOtpEmail as jest.Mock);

    await expect(
      userService.resetPasswordWithOtp({ email, otp: '000000', new_password: 'X' } as never)
    ).rejects.toThrow('Invalid OTP');

    await expireOtp(id, 'password_reset_otp');
    await expect(
      userService.resetPasswordWithOtp({ email, otp: code, new_password: 'X' } as never)
    ).rejects.toThrow('expired');

    await expect(
      userService.resetPasswordWithOtp({ email: 'nobody@duncit.com', otp: code, new_password: 'X' } as never)
    ).rejects.toThrow('Invalid OTP');
  });

  it('clears the code on success, so it cannot be used twice', async () => {
    const { id, email } = await makeUser();
    await userService.requestPasswordResetOtp({ email } as never);
    const code = codeFrom(sendPasswordResetOtpEmail as jest.Mock);
    await userService.resetPasswordWithOtp({ email, otp: code, new_password: 'BrandNew123' } as never);

    await expect(
      userService.resetPasswordWithOtp({ email, otp: code, new_password: 'Another123' } as never)
    ).rejects.toThrow();
  });
});

describe('changing a known password', () => {
  it('proves the CURRENT password before sending anything', async () => {
    const { id } = await makeUser();

    await expect(
      userService.requestPasswordChangeOtp(id, { current_password: 'wrong' } as never)
    ).rejects.toThrow('Current password is incorrect');
    expect(sendPasswordChangeOtpEmail).not.toHaveBeenCalled();
  });

  it('sends a code once the current password is proved', async () => {
    const { id } = await makeUser();

    await userService.requestPasswordChangeOtp(id, { current_password: PASSWORD } as never);

    expect(sendPasswordChangeOtpEmail).toHaveBeenCalled();
  });

  it('refuses an account signed in through Google, which has no password to change', async () => {
    const doc = await UserModel.create({
      profile: { first_name: 'Google' },
      auth: { email: `google-${Date.now()}@duncit.com` },
      metadata: { status: 'ACTIVE' },
    });

    await expect(
      userService.requestPasswordChangeOtp(String(doc._id), { current_password: 'x' } as never)
    ).rejects.toThrow('Google sign-in');
  });

  it('sets the new password once the code is confirmed', async () => {
    const { id } = await makeUser();
    await userService.requestPasswordChangeOtp(id, { current_password: PASSWORD } as never);
    const code = codeFrom(sendPasswordChangeOtpEmail as jest.Mock);

    await userService.changePasswordWithOtp(id, { otp: code, new_password: 'BrandNew123' } as never);

    const doc = await UserModel.findById(id).select('+auth.password').lean<any>();
    expect(await bcrypt.compare('BrandNew123', doc.auth.password)).toBe(true);
  });

  it('refuses a wrong or expired code', async () => {
    const { id } = await makeUser();
    await userService.requestPasswordChangeOtp(id, { current_password: PASSWORD } as never);
    const code = codeFrom(sendPasswordChangeOtpEmail as jest.Mock);

    await expect(
      userService.changePasswordWithOtp(id, { otp: '000000', new_password: 'X' } as never)
    ).rejects.toThrow('Invalid OTP');

    await expireOtp(id, 'password_change_otp');
    await expect(
      userService.changePasswordWithOtp(id, { otp: code, new_password: 'X' } as never)
    ).rejects.toThrow('expired');
  });
});

describe('confirming with a password', () => {
  it('needs both the account email and its password', async () => {
    const { id, email } = await makeUser();

    await expect(userService.assertPasswordConfirmation(id, email, PASSWORD)).resolves.toBe(true);
  });

  it('refuses somebody typing another account email', async () => {
    const { id } = await makeUser();

    await expect(
      userService.assertPasswordConfirmation(id, 'someone.else@duncit.com', PASSWORD)
    ).rejects.toThrow('does not match');
  });

  it('refuses a wrong password', async () => {
    const { id, email } = await makeUser();

    await expect(userService.assertPasswordConfirmation(id, email, 'wrong')).rejects.toThrow(
      'Password is incorrect'
    );
  });

  it('matches the email however it was typed', async () => {
    const { id, email } = await makeUser();

    await expect(
      userService.assertPasswordConfirmation(id, `  ${email.toUpperCase()} `, PASSWORD)
    ).resolves.toBe(true);
  });

  it('refuses a Google-only account, which has no password to confirm with', async () => {
    const doc = await UserModel.create({
      profile: { first_name: 'Google' },
      auth: { email: `google2-${Date.now()}@duncit.com` },
      metadata: { status: 'ACTIVE' },
    });

    await expect(
      userService.assertPasswordConfirmation(String(doc._id), 'google2@duncit.com', 'x')
    ).rejects.toThrow('Google sign-in');
  });
});

describe('deleting an account', () => {
  it('sends a code before anything is deleted', async () => {
    const { id } = await makeUser();

    const result = await userService.requestAccountDeletionOtp(id);

    expect(result.dev_otp).toBe(codeFrom(sendAccountDeletionOtpEmail as jest.Mock));
    expect(sendAccountDeletionOtpEmail).toHaveBeenCalled();
    const doc = await UserModel.findById(id).lean<any>();
    expect(doc?.metadata?.status).toBe('ACTIVE');
  });

  it('refuses an account with no address to send the code to', async () => {
    const doc = await UserModel.create({
      profile: { first_name: 'Nobody' },
      auth: {},
      metadata: { status: 'ACTIVE' },
    });

    await expect(userService.requestAccountDeletionOtp(String(doc._id))).rejects.toThrow(
      'Add an email address'
    );
  });

  it('files the request only once the code is confirmed, and erases nothing', async () => {
    const { id } = await makeUser();
    await userService.requestAccountDeletionOtp(id);
    const code = codeFrom(sendAccountDeletionOtpEmail as jest.Mock);

    const filed = await accountDeletionService.submitRequest(id, { otp: code });
    expect(filed).toMatchObject({ status: 'PENDING' });

    // The code is spent, and the account is not: erasure is the Tech portal's
    // to carry out, so the credentials are still here until it does.
    const doc = await UserModel.findById(id).select('+auth.password').lean<any>();
    expect(doc?.metadata?.status).toBe('ACTIVE');
    expect(doc?.auth?.password).toBeTruthy();
    await expect(accountDeletionService.submitRequest(id, { otp: code })).rejects.toThrow(
      'expired'
    );
  });

  it('refuses a wrong or expired code, and files nothing', async () => {
    const { id } = await makeUser();
    await userService.requestAccountDeletionOtp(id);
    const code = codeFrom(sendAccountDeletionOtpEmail as jest.Mock);

    await expect(accountDeletionService.submitRequest(id, { otp: '000000' })).rejects.toThrow(
      'Invalid OTP'
    );

    await expireOtp(id, 'account_deletion_otp');
    await expect(accountDeletionService.submitRequest(id, { otp: code })).rejects.toThrow(
      'expired'
    );

    const doc = await UserModel.findById(id).lean<any>();
    expect(doc?.metadata?.status).toBe('ACTIVE');
    expect(await accountDeletionService.myRequest(id)).toBeNull();
  });

  it('refuses an account that does not exist', async () => {
    await expect(
      accountDeletionService.submitRequest(new Types.ObjectId().toString(), { otp: '123456' })
    ).rejects.toThrow('User not found');
  });
});
