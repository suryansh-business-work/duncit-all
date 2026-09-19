import { env } from '../config/env';
import { signToken } from '../context';
import { LiteOtpModel } from '../models/otp.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, configError, forbidden, upstreamError } from '../utils/errors';
import { oneTimeCode, sha256 } from '../utils/ids';
import { log } from '../utils/log';
import { OTP_6, cleanText, normalizeEmail } from '../utils/validate';
import { duncitBridge } from './duncit.bridge';
import { emailService } from './email.service';
import { envEntryService, readString } from './envEntry.service';
import { settingsService } from './settings.service';
import { freeHandle, toPublicUser, userService } from './user.service';

const CODE_TTL_MINUTES = 10;
const RESEND_AFTER_SECONDS = 45;
const MAX_ATTEMPTS = 5;

async function isBootstrapAdmin(email: string): Promise<boolean> {
  const settings = await settingsService.get();
  return env.adminEmails.includes(email) || (settings.admin_emails ?? []).includes(email);
}

/** Find the account for a proven email, or create a minimal one. */
async function upsertUser(email: string, extra: { name?: string; duncitUserId?: string; googleSub?: string; handleSeed?: string }): Promise<LiteUserDoc> {
  let user = await userService.byEmail(email);
  if (!user) {
    const name = cleanText(extra.name, 80, 'Name') || email.split('@')[0];
    user = await LiteUserModel.create({
      email,
      name,
      handle: await freeHandle(extra.handleSeed || name),
      duncit_user_id: extra.duncitUserId ?? '',
      google_sub: extra.googleSub ?? '',
      is_admin: await isBootstrapAdmin(email),
    });
  } else {
    if (extra.duncitUserId && !user.duncit_user_id) user.duncit_user_id = extra.duncitUserId;
    if (extra.googleSub && !user.google_sub) user.google_sub = extra.googleSub;
    if (!user.is_admin && (await isBootstrapAdmin(email))) user.is_admin = true;
  }
  if (user.is_blocked) throw forbidden('This account has been blocked');
  user.last_sign_in_at = new Date();
  await user.save();
  return user;
}

async function payload(user: LiteUserDoc) {
  return { token: signToken(user), user: await userService.me(user) };
}

export const authService = {
  /**
   * One door for everyone: a Duncit account gets the main API's own code, and
   * anybody else gets Lite's. The client shows the same "enter the code" step
   * either way; `via` only changes the sentence above it.
   */
  async requestCode(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const latest = await LiteOtpModel.findOne({ email, consumed_at: null }).sort({ created_at: -1 });
    if (latest && Date.now() - latest.last_sent_at.getTime() < RESEND_AFTER_SECONDS * 1000) {
      const wait = Math.ceil((RESEND_AFTER_SECONDS * 1000 - (Date.now() - latest.last_sent_at.getTime())) / 1000);
      throw badInput(`Please wait ${wait}s before asking for another code`);
    }
    const settings = await settingsService.get();
    if (settings.sign_in_with_duncit) {
      const viaDuncit = await duncitBridge.requestCode(email);
      if (viaDuncit) {
        await LiteOtpModel.create({ email, via: 'DUNCIT', expires_at: new Date(Date.now() + viaDuncit.expires_in_minutes * 60_000) });
        return { ok: true, via: 'DUNCIT' as const, expires_in_minutes: viaDuncit.expires_in_minutes, resend_after_seconds: viaDuncit.resend_after_seconds, test_code: null };
      }
    }
    const smtp = await emailService.smtp();
    const code = smtp ? oneTimeCode() : env.otpTestCode;
    await LiteOtpModel.create({ email, via: 'LITE', code_hash: sha256(code), expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000) });
    if (smtp) {
      const outcome = await emailService.send({ to: email, templateKey: 'sign_in_code', vars: { code, minutes: CODE_TTL_MINUTES } });
      if (outcome.status === 'FAILED') throw upstreamError(`We could not email the code: ${outcome.message}`);
    } else {
      log.warn('auth', 'requestCode', { msg: 'no mailbox configured; stub code returned', email });
    }
    return { ok: true, via: 'LITE' as const, expires_in_minutes: CODE_TTL_MINUTES, resend_after_seconds: RESEND_AFTER_SECONDS, test_code: smtp ? null : code };
  },

  async verifyCode(rawEmail: string, rawCode: string, name?: string | null) {
    const email = normalizeEmail(rawEmail);
    const code = String(rawCode ?? '').trim();
    if (!OTP_6.test(code)) throw badInput('Enter the 6-digit code');
    const challenge = await LiteOtpModel.findOne({ email, consumed_at: null }).sort({ created_at: -1 });
    if (!challenge) throw badInput('Ask for a new code first');
    if (challenge.expires_at.getTime() < Date.now()) throw badInput('That code has expired. Ask for a new one');
    if (challenge.attempts >= MAX_ATTEMPTS) throw badInput('Too many tries. Ask for a new code');
    challenge.attempts += 1;
    await challenge.save();

    if (challenge.via === 'DUNCIT') {
      const account = await duncitBridge.verifyCode(email, code);
      if (!account) throw badInput('That code is not right');
      challenge.consumed_at = new Date();
      await challenge.save();
      return payload(await upsertUser(email, { name: account.name, duncitUserId: account.user_id, handleSeed: account.username || account.name }));
    }
    if (challenge.code_hash !== sha256(code)) throw badInput('That code is not right');
    challenge.consumed_at = new Date();
    await challenge.save();
    return payload(await upsertUser(email, { name: name ?? undefined }));
  },

  /** Google's ID token, checked with Google's tokeninfo endpoint against the configured client id. */
  async signInWithGoogle(idToken: string) {
    const google = await envEntryService.activeConfig('GOOGLE_OAUTH');
    const clientId = readString(google, 'client_id');
    if (!clientId) throw configError('Google sign-in is not configured');
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw badInput('Google did not accept that sign-in. Please try again');
    const info = (await res.json()) as { aud?: string; email?: string; email_verified?: string; name?: string; sub?: string };
    if (info.aud !== clientId || !info.email || info.email_verified !== 'true') throw badInput('Google did not accept that sign-in. Please try again');
    return payload(await upsertUser(normalizeEmail(info.email), { name: info.name, googleSub: info.sub }));
  },

  toPublicUser,
};
