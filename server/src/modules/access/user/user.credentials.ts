/**
 * `userService` — emailed one-time codes: email verification, portal sign-in,
 * password reset/change and account-deletion confirmation. Composed into
 * `userService` in user.service.ts.
 */
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { UserModel } from './user.model';
import { EMAIL_OTP_MINUTES, hashOtp } from './email-otp';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import type {
  RequestPasswordResetDTO,
  ResetPasswordDTO,
  RequestPasswordChangeDTO,
  ChangePasswordDTO,
} from '@modules/access/auth/auth.validator';
import { assertPortalLogin } from '@modules/portals';
import { noteSignIn, type SignInContext } from './user.signin';
import {
  sendEmailVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
  sendPortalLoginOtpEmail,
  sendPasswordChangeOtpEmail,
  sendAccountDeletionOtpEmail,
} from '@services/email/email.service';
import { authPayload, toPublic } from './user.public';

/**
 * How long a sign-in code has to run before another will be sent.
 *
 * Measured from the END of its life rather than its start, so "still valid with
 * this much left" is one comparison. A minute is long enough to stop a loop and
 * short enough that somebody who genuinely lost the mail is not stuck.
 */
const RESEND_COOLDOWN_MS = (EMAIL_OTP_MINUTES * 60 - 60) * 1000;

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

export const userCredentialMethods = {
  async requestEmailVerificationOtp(user_id: string) {
    const user = await UserModel.findById(user_id).select(
      '+auth.email_verification_otp_hash +auth.email_verification_otp_expires_at'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    if (!user.auth?.email) {
      throw new GraphQLError('Add an email address before requesting OTP', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (user.auth?.is_email_verified) return { ok: true, dev_otp: null };
    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.email_verification_otp_hash': hashOtp(otp),
          'auth.email_verification_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
        },
      }
    );
    await sendEmailVerificationOtpEmail({
      to: user.auth.email,
      name: user.profile?.first_name,
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: isDev ? otp : null };
  },

  async verifyEmailVerificationOtp(user_id: string, otp: string) {
    const code = String(otp || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new GraphQLError('Enter the 6 digit OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const user = await UserModel.findById(user_id).select(
      '+auth.email_verification_otp_hash +auth.email_verification_otp_expires_at'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    if (user.auth?.is_email_verified) return toPublic(user);
    const expiresAt = (user as any).auth?.email_verification_otp_expires_at as Date | undefined;
    const storedHash = (user as any).auth?.email_verification_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new GraphQLError('OTP expired. Request a new OTP.', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (hashOtp(code) !== storedHash) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { 'auth.is_email_verified': true },
        $unset: {
          'auth.email_verification_otp_hash': '',
          'auth.email_verification_otp_expires_at': '',
        },
      }
    );
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before: user, after: fresh });
    return toPublic(fresh);
  },

  /**
   * Email a one-time code for signing in to a console.
   *
   * The gate runs BEFORE the send, and it is the same one the password login
   * ends with: the address must belong to an active account that already holds
   * a role for this portal. A code is not a second way in — it is the same door
   * with a different key, so it may not open anything a password would not.
   *
   * Refusals are deliberately identical whatever the reason. "No such account",
   * "not active" and "no access to Finance" told apart would make this page a
   * directory of who works here and what they can reach.
   */
  async requestPortalLoginOtp(input: { email: string; portal_key?: string | null }) {
    const email = String(input.email || '').trim().toLowerCase();
    const portalKey = String(input.portal_key || '').trim();
    const user = await UserModel.findOne({ 'auth.email': email });
    const silent = { ok: true, dev_otp: null as string | null };
    // A sealed account gets the same silent answer an unknown address does —
    // no code is minted and no mail goes out, because the code could only ever
    // open a door that is now closed.
    if (!user || isAccountLocked(String(user._id))) return silent;
    if ((user as any).metadata?.status !== 'ACTIVE') return silent;

    const pub = await toPublic(user);
    try {
      assertPortalLogin(portalKey, pub?.roles ?? []);
    } catch {
      return silent;
    }

    /*
      One code in flight at a time.

      This mutation takes no token and sends mail, so without a cooldown anyone
      who knows a colleague's address can post it in a loop and fill their inbox.
      A live code is left alone rather than replaced — the answer is the same
      either way, so a caller cannot tell a cooldown from a send, and the person
      still has the code they were sent.
    */
    const live = await UserModel.findOne({ _id: user._id })
      .select('+auth.portal_login_otp_expires_at +auth.portal_login_otp_portal')
      .lean();
    const liveAuth = (live as any)?.auth ?? {};
    const liveExpiry = liveAuth.portal_login_otp_expires_at as Date | undefined;
    const stillValid =
      liveExpiry &&
      liveExpiry.getTime() - RESEND_COOLDOWN_MS > Date.now() &&
      liveAuth.portal_login_otp_portal === portalKey;
    if (stillValid) return silent;

    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.portal_login_otp_hash': hashOtp(otp),
          'auth.portal_login_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
          'auth.portal_login_otp_portal': portalKey,
        },
      }
    );
    await sendPortalLoginOtpEmail({
      to: email,
      name: user.profile?.first_name || 'there',
      otp,
      portal: portalKey || 'Duncit',
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: isDev ? otp : null };
  },

  /**
   * Trade a correct code for the same session a password would have produced.
   *
   * The code is spent whether or not the rest succeeds: a six-digit secret that
   * survives a failed attempt is a six-digit secret somebody can keep guessing.
   * The portal it was issued for is checked too, so a code emailed for the one
   * console this person can reach cannot be typed into another.
   */
  async loginWithPortalOtp(
    input: { email: string; otp: string; portal_key?: string | null },
    signIn?: SignInContext
  ) {
    const email = String(input.email || '').trim().toLowerCase();
    const code = String(input.otp || '').trim();
    const portalKey = String(input.portal_key || '').trim();
    const invalid = () =>
      new GraphQLError('Invalid or expired code', { extensions: { code: 'UNAUTHENTICATED' } });

    const user = await UserModel.findOne({ 'auth.email': email }).select(
      '+auth.portal_login_otp_hash +auth.portal_login_otp_expires_at +auth.portal_login_otp_portal'
    );
    if (!user) throw invalid();

    const auth = (user as any).auth ?? {};
    const storedHash = auth.portal_login_otp_hash as string | undefined;
    const expiresAt = auth.portal_login_otp_expires_at as Date | undefined;
    const issuedFor = (auth.portal_login_otp_portal as string | undefined) ?? '';

    const clearOtp = () =>
      UserModel.updateOne(
        { _id: user._id },
        {
          $unset: {
            'auth.portal_login_otp_hash': '',
            'auth.portal_login_otp_expires_at': '',
            'auth.portal_login_otp_portal': '',
          },
        }
      );

    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      await clearOtp();
      throw invalid();
    }
    if (hashOtp(code) !== storedHash || issuedFor !== portalKey) {
      await clearOtp();
      throw invalid();
    }
    await clearOtp();

    // Checked after the code is spent, so a sealed account cannot be told apart
    // from a wrong code by how quickly it answers.
    if (isAccountLocked(String(user._id))) throw invalid();
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { 'auth.last_login_provider': 'EMAIL', 'auth.last_login_at': new Date() } }
    );
    const fresh = await UserModel.findById(user._id);
    const payload = await authPayload(fresh);
    // Checked again on the way in: roles can be revoked between the code being
    // sent and it being typed, and this is the moment that grants the session.
    assertPortalLogin(portalKey, payload.user.roles);
    noteSignIn(fresh as any, signIn ?? {}).catch(() => undefined);
    return payload;
  },

  // Public: email a password-reset OTP. Always returns ok to avoid leaking which
  // emails are registered; the OTP is only generated/sent for a real account
  // that has a password (Google-only accounts have none).
  async requestPasswordResetOtp(input: RequestPasswordResetDTO) {
    const email = String(input.email || '').trim().toLowerCase();
    const user = await UserModel.findOne({ 'auth.email': email }).select('+auth.password');
    // Only a registered account with a password can receive a reset OTP. An
    // unregistered email gets no OTP and is reported back so the UI can prompt
    // the visitor to create an account instead.
    // A sealed account reads as unregistered here. Resetting the password of an
    // account that is being deleted opens nothing — every door already refuses
    // it — so the only thing a code would do is arrive in the mailbox of
    // somebody who has just been told their account is closing.
    if (!user?.auth?.password || isAccountLocked(String(user._id))) {
      return { ok: false, registered: false, dev_otp: null };
    }
    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.password_reset_otp_hash': hashOtp(otp),
          'auth.password_reset_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
        },
      }
    );
    await sendPasswordResetOtpEmail({
      to: email,
      name: user.profile?.first_name || 'there',
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, registered: true, dev_otp: isDev ? otp : null };
  },

  // Public: verify the OTP and set a new password. Generic errors prevent email
  // enumeration. On success the reset OTP is cleared and password_changed_at set.
  async resetPasswordWithOtp(input: ResetPasswordDTO) {
    const email = String(input.email || '').trim().toLowerCase();
    const code = String(input.otp || '').trim();
    const user = await UserModel.findOne({ 'auth.email': email }).select(
      '+auth.password_reset_otp_hash +auth.password_reset_otp_expires_at'
    );
    // A sealed account was never sent a code, but one issued before it was
    // sealed could still be in a mailbox — so the redeem side refuses too, with
    // the same words a wrong code gets.
    if (!user || isAccountLocked(String(user._id))) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const expiresAt = (user as any).auth?.password_reset_otp_expires_at as Date | undefined;
    const storedHash = (user as any).auth?.password_reset_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new GraphQLError('OTP expired. Request a new OTP.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (hashOtp(code) !== storedHash) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const hashed = await bcrypt.hash(input.new_password, 10);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { 'auth.password': hashed, 'auth.password_changed_at': new Date() },
        $unset: {
          'auth.password_reset_otp_hash': '',
          'auth.password_reset_otp_expires_at': '',
        },
      }
    );
    await sendPasswordChangedEmail(email, (user as any).profile?.first_name ?? '');
    return true;
  },

  // Auth-required: step one of setting the account password. An account that
  // has a password proves it here; a Google-signup account has none to prove
  // and is CREATING its first. Either way it ends with a confirmation OTP.
  async requestPasswordChangeOtp(user_id: string, input: RequestPasswordChangeDTO) {
    const user = await UserModel.findById(user_id).select('+auth.password');
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const stored = (user as any).auth?.password as string | undefined;
    /*
      A Google-signup account has no password, so this flow CREATES its first
      one: there is nothing to compare against and the emailed code is the whole
      proof. Only when a hash already exists does the old password have to be
      shown — which is why the client never sends one it does not have.
    */
    if (stored) {
      const supplied = input.current_password ?? '';
      const ok = supplied ? await bcrypt.compare(supplied, stored) : false;
      if (!ok) {
        throw new GraphQLError('Current password is incorrect', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }
    const email = user.auth?.email;
    if (!email) {
      throw new GraphQLError('Add an email address before changing your password', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.password_change_otp_hash': hashOtp(otp),
          'auth.password_change_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
        },
      }
    );
    await sendPasswordChangeOtpEmail({
      to: email,
      name: user.profile?.first_name || 'there',
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: isDev ? otp : null };
  },

  /** Re-verify the signed-in user's OWN email + password to authorize a sensitive
   * action (e.g. a developer hard-delete). Throws on any mismatch. Google-only
   * accounts (no password) cannot confirm this way — same as password change. */
  async assertPasswordConfirmation(user_id: string, email: string, password: string) {
    const user = await UserModel.findById(user_id).select('+auth.password');
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const stored = (user as any).auth?.password as string | undefined;
    if (!stored) {
      throw new GraphQLError('This account uses Google sign-in and has no password to confirm with.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const accountEmail = String(user.auth?.email ?? '').toLowerCase();
    if (email?.trim().toLowerCase() !== accountEmail) {
      throw new GraphQLError('The email does not match your account', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const ok = await bcrypt.compare(String(password ?? ''), stored);
    if (!ok) {
      throw new GraphQLError('Password is incorrect', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    return true;
  },

  // Auth-required: confirm the OTP from requestPasswordChangeOtp and set the new
  // password. On success the change OTP is cleared and password_changed_at set.
  async changePasswordWithOtp(user_id: string, input: ChangePasswordDTO) {
    const code = String(input.otp || '').trim();
    const user = await UserModel.findById(user_id).select(
      '+auth.password +auth.password_change_otp_hash +auth.password_change_otp_expires_at'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const expiresAt = (user as any).auth?.password_change_otp_expires_at as Date | undefined;
    const storedHash = (user as any).auth?.password_change_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new GraphQLError('OTP expired. Request a new OTP.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (hashOtp(code) !== storedHash) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // Re-setting the same password is not a change: the OTP is already proven
    // here, so this is the last gate before the hash is written.
    const currentHash = (user as any).auth?.password as string | undefined;
    if (currentHash && (await bcrypt.compare(input.new_password, currentHash))) {
      throw new GraphQLError('New password must be different from your current password', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const hashed = await bcrypt.hash(input.new_password, 10);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { 'auth.password': hashed, 'security.password_changed_at': new Date() },
        $unset: {
          'auth.password_change_otp_hash': '',
          'auth.password_change_otp_expires_at': '',
        },
      }
    );
    await sendPasswordChangedEmail(
      (user as any).auth?.email ?? '',
      (user as any).profile?.first_name ?? ''
    );
    return true;
  },

  // Auth-required: email a confirmation OTP before self-serve account deletion.
  async requestAccountDeletionOtp(user_id: string) {
    const user = await UserModel.findById(user_id);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const email = user.auth?.email;
    if (!email) {
      throw new GraphQLError('Add an email address before deleting your account', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.account_deletion_otp_hash': hashOtp(otp),
          'auth.account_deletion_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
        },
      }
    );
    await sendAccountDeletionOtpEmail({
      to: email,
      name: user.profile?.first_name || 'there',
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: isDev ? otp : null };
  },

  /**
   * Check and spend the emailed account-deletion code, answering the user doc.
   *
   * All that is left here of the old self-serve delete. Deleting an account is
   * no longer something this service does: it reaches into every collection the
   * member appears in and cannot be undone, so it is queued as a request and a
   * human in the Tech portal carries it out. What has NOT changed is the proof
   * required to ask, which is this — and it stays here because hashOtp and the
   * OTP fields are this module's, not the queue's.
   *
   * Single use: the hash is cleared as soon as it matches, so one code files
   * one request.
   */
  async consumeAccountDeletionOtp(user_id: string, otp: string) {
    const code = String(otp || '').trim();
    const user = await UserModel.findById(user_id).select(
      '+auth.account_deletion_otp_hash +auth.account_deletion_otp_expires_at'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const expiresAt = (user as any).auth?.account_deletion_otp_expires_at as Date | undefined;
    const storedHash = (user as any).auth?.account_deletion_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new GraphQLError('OTP expired. Request a new OTP.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (hashOtp(code) !== storedHash) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await UserModel.updateOne(
      { _id: user._id },
      {
        $unset: {
          'auth.account_deletion_otp_hash': '',
          'auth.account_deletion_otp_expires_at': '',
        },
      }
    );
    return user;
  },
};
