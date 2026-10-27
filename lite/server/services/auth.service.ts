import { env } from '../config/env';
import { signToken } from '../utils/token';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, configError, forbidden, upstreamError } from '../utils/errors';
import { oneTimeCode, sha256 } from '../utils/ids';
import { log } from '../utils/log';
import { cleanText, normalizeEmail, normalizePhone } from '../utils/validate';
import { duncitBridge } from './duncit.bridge';
import { emailService } from './email.service';
import { envEntryService, readString } from './envEntry.service';
import { activeMsg91, msg91SendOtp, msg91VerifyOtp, type Msg91Credentials } from './msg91.gateway';
import { CODE_TTL_MINUTES, RESEND_AFTER_SECONDS, otpChallenge } from './otp.challenge';
import { settingsService } from './settings.service';
import { freeHandle, toPublicUser, userService } from './user.service';

async function isBootstrapAdmin(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const settings = await settingsService.get();
  return env.adminEmails.includes(email) || (settings.admin_emails ?? []).includes(email);
}

interface Identity {
  email?: string;
  phone?: string;
  name?: string;
  duncitUserId?: string;
  googleSub?: string;
  handleSeed?: string;
}

/** Find the account for a proven email or phone, or create a minimal one. */
async function upsertUser(identity: Identity): Promise<LiteUserDoc> {
  const { email, phone } = identity;
  let user = email ? await userService.byEmail(email) : await userService.byPhone(phone ?? '');
  if (user) {
    if (identity.duncitUserId && !user.duncit_user_id) user.duncit_user_id = identity.duncitUserId;
    if (identity.googleSub && !user.google_sub) user.google_sub = identity.googleSub;
    if (!user.is_admin && (await isBootstrapAdmin(user.email ?? undefined))) user.is_admin = true;
  } else {
    // A phone-only account has no mailbox to name it after; the last digits stand in.
    const fallbackName = email ? email.split('@')[0] : `Guest ${(phone ?? '').slice(-4)}`;
    const name = cleanText(identity.name, 80, 'Name') || fallbackName;
    user = await LiteUserModel.create({
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      name,
      handle: await freeHandle(identity.handleSeed || name),
      duncit_user_id: identity.duncitUserId ?? '',
      google_sub: identity.googleSub ?? '',
      is_admin: await isBootstrapAdmin(email),
    });
  }
  if (user.is_blocked) throw forbidden('This account has been blocked');
  user.last_sign_in_at = new Date();
  await user.save();
  return user;
}

async function payload(user: LiteUserDoc) {
  return { token: signToken(user), user: await userService.me(user) };
}

/** MSG91, when phone sign-in is switched on and an entry is configured; otherwise a clear refusal. */
export async function requirePhoneCarrier(): Promise<Msg91Credentials> {
  const [settings, creds] = await Promise.all([settingsService.get(), activeMsg91()]);
  if (!settings.sign_in_with_phone || !creds) throw configError('Phone sign-in is not available right now. Use your email instead');
  return creds;
}

/** Send an SMS code through MSG91 and open the challenge that remembers its request id. */
export async function sendSmsCode(phone: string, purpose: 'SIGN_IN' | 'LINK', userId?: unknown) {
  const creds = await requirePhoneCarrier();
  await otpChallenge.assertCanSend({ phone }, purpose);
  const sent = await msg91SendOtp(creds, phone.slice(1));
  if (!sent.ok) throw upstreamError(`We could not text a code to that number: ${sent.message}`);
  await otpChallenge.open({ phone }, purpose, { via: 'SMS', req_id: sent.message, user_id: userId ?? null });
  return { ok: true, via: 'SMS' as const, expires_in_minutes: CODE_TTL_MINUTES, resend_after_seconds: RESEND_AFTER_SECONDS, test_code: null };
}

/** MSG91's verdict on an SMS code; false for a wrong code, a throw only for a carrier fault. */
export async function checkSmsCode(reqId: string, code: string): Promise<boolean> {
  const creds = await requirePhoneCarrier();
  const verdict = await msg91VerifyOtp(creds, reqId, code);
  return verdict.ok;
}

/** Email Lite's own code (or hand back the stub while no mailbox is configured). */
export async function sendEmailCode(email: string, purpose: 'SIGN_IN' | 'LINK', userId?: unknown) {
  const smtp = await emailService.smtp();
  const code = smtp ? oneTimeCode() : env.otpTestCode;
  await otpChallenge.open({ email }, purpose, { via: 'LITE', code_hash: sha256(code), user_id: userId ?? null });
  if (smtp) {
    const outcome = await emailService.send({ to: email, templateKey: 'sign_in_code', vars: { code, minutes: CODE_TTL_MINUTES } });
    if (outcome.status === 'FAILED') throw upstreamError(`We could not email the code: ${outcome.message}`);
  } else {
    log.warn('auth', 'sendEmailCode', { msg: 'no mailbox configured; stub code returned', purpose });
  }
  return { ok: true, via: 'LITE' as const, expires_in_minutes: CODE_TTL_MINUTES, resend_after_seconds: RESEND_AFTER_SECONDS, test_code: smtp ? null : code };
}

export const authService = {
  /**
   * One door for everyone: a Duncit account gets the main API's own code, and
   * anybody else gets Lite's. The client shows the same "enter the code" step
   * either way; `via` only changes the sentence above it.
   */
  async requestCode(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    await otpChallenge.assertCanSend({ email }, 'SIGN_IN');
    const settings = await settingsService.get();
    if (settings.sign_in_with_duncit) {
      const viaDuncit = await duncitBridge.requestCode(email);
      if (viaDuncit) {
        await otpChallenge.open({ email }, 'SIGN_IN', { via: 'DUNCIT', ttlMinutes: viaDuncit.expires_in_minutes });
        return { ok: true, via: 'DUNCIT' as const, expires_in_minutes: viaDuncit.expires_in_minutes, resend_after_seconds: viaDuncit.resend_after_seconds, test_code: null };
      }
    }
    return sendEmailCode(email, 'SIGN_IN');
  },

  async verifyCode(rawEmail: string, rawCode: string, name?: string | null) {
    const email = normalizeEmail(rawEmail);
    const { challenge, code } = await otpChallenge.take({ email }, 'SIGN_IN', rawCode);
    if (challenge.via === 'DUNCIT') {
      const account = await duncitBridge.verifyCode(email, code);
      if (!account) throw badInput('That code is not right');
      await otpChallenge.consume(challenge);
      return payload(await upsertUser({ email, name: account.name, duncitUserId: account.user_id, handleSeed: account.username || account.name }));
    }
    if (challenge.code_hash !== sha256(code)) throw badInput('That code is not right');
    await otpChallenge.consume(challenge);
    return payload(await upsertUser({ email, name: name ?? undefined }));
  },

  /** "Use phone number": MSG91 texts the code and checks it. */
  async requestPhoneCode(rawPhone: string) {
    const creds = await requirePhoneCarrier();
    return sendSmsCode(normalizePhone(rawPhone, creds.default_country_code), 'SIGN_IN');
  },

  async verifyPhoneCode(rawPhone: string, rawCode: string, name?: string | null) {
    const creds = await requirePhoneCarrier();
    const phone = normalizePhone(rawPhone, creds.default_country_code);
    const { challenge, code } = await otpChallenge.take({ phone }, 'SIGN_IN', rawCode);
    if (!(await checkSmsCode(challenge.req_id, code))) throw badInput('That code is not right');
    await otpChallenge.consume(challenge);
    return payload(await upsertUser({ phone, name: name ?? undefined }));
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
    return payload(await upsertUser({ email: normalizeEmail(info.email), name: info.name, googleSub: info.sub }));
  },

  /** The account an MCP call acts as: found or made by its proven email, exactly as a sign-in would. */
  async accountForEmail(rawEmail: string, name?: string, duncitUserId?: string): Promise<LiteUserDoc> {
    return upsertUser({ email: normalizeEmail(rawEmail), name, duncitUserId });
  },

  toPublicUser,
};
