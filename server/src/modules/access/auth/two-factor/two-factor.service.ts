import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import QRCode from 'qrcode';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { authPayload, toPublic } from '@modules/access/user/user.public';
import { noteSignIn, type SignInContext } from '@modules/access/user/user.signin';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { assertPortalLogin } from '@modules/portals';
import { SIX_DIGIT_CODE } from '@utils/regex';
import {
  CHALLENGE_TTL_SECONDS,
  signChallenge,
  verifyChallenge,
  type SignInProvider,
} from './two-factor.challenge';
import {
  TWO_FACTOR_SECRETS,
  newRecoveryCodes,
  proveSecondFactor,
  type TwoFactorAccount,
} from './two-factor.proof';
import { generateTotpSecret, matchTotpStep, otpauthUri } from './two-factor.totp';

/**
 * Authenticator-app sign-in for the consoles.
 *
 * Turned on from a console's Profile > Security, and asked for only when a
 * sign-in names a console (`portal_key`). The member apps never send one, so
 * an account with this on signs in to mWeb and the app exactly as before —
 * the setting protects the doors it was switched on from.
 */

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const conflict = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'CONFLICT' } });

async function accountWithSecrets(userId: string) {
  const user = isValidObjectId(userId)
    ? await UserModel.findById(userId).select(TWO_FACTOR_SECRETS)
    : null;
  if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  return user;
}

/** What turning the feature off writes — every trace of the old secret goes. */
const CLEARED = {
  'security.two_factor_enabled': false,
  'security.two_factor_enabled_at': null,
  'security.two_factor_secret': '',
  'security.two_factor_pending_secret': '',
  'security.two_factor_recovery_code_hashes': [],
  'security.two_factor_last_step': null,
  'security.failed_login_attempts': 0,
  'security.locked_until': null,
};

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
  qr_code_data_url: string;
}

export const twoFactorService = {
  /**
   * Step one: a fresh secret, as a QR code and as text for typing in.
   *
   * Parked as PENDING — nothing changes about how the account signs in until
   * `enable` proves the app really holds it. Asking again replaces it.
   */
  async startSetup(userId: string): Promise<TwoFactorSetup> {
    const user = await accountWithSecrets(userId);
    if (user.security?.two_factor_enabled) {
      throw conflict('Authenticator app sign-in is already on. Turn it off first to set up a new app.');
    }
    const secret = generateTotpSecret();
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { 'security.two_factor_pending_secret': secret } }
    );
    // The name the app files the entry under — the admin-configured business
    // name, the same one invoices carry.
    const { business_name: issuer } = await getFinanceSettings();
    const account = user.auth?.email || user.profile?.username || String(user._id);
    const otpauth_url = otpauthUri(issuer, account, secret);
    const qr_code_data_url = await QRCode.toDataURL(otpauth_url, { width: 240, margin: 1 });
    return { secret, otpauth_url, qr_code_data_url };
  },

  /** Step two: a code from the app proves the scan, and the recovery codes are shown once. */
  async enable(userId: string, rawCode: string): Promise<string[]> {
    const user = await accountWithSecrets(userId);
    if (user.security?.two_factor_enabled) throw conflict('Authenticator app sign-in is already on.');
    const pending: string = user.security?.two_factor_pending_secret ?? '';
    if (!pending) throw badInput('Start the setup again — scan a new QR code.');
    const code = String(rawCode ?? '').trim();
    const step = SIX_DIGIT_CODE.test(code) ? matchTotpStep(pending, code, Date.now()) : null;
    if (step === null) throw badInput('That code does not match. Check the app and try again.');

    const { codes, hashes } = newRecoveryCodes();
    // Conditional on the pending secret still being the one checked, so a
    // second "Set up" in another tab cannot be enabled with this tab's code.
    const res = await UserModel.updateOne(
      { _id: user._id, 'security.two_factor_pending_secret': pending },
      {
        $set: {
          'security.two_factor_enabled': true,
          'security.two_factor_enabled_at': new Date(),
          'security.two_factor_secret': pending,
          'security.two_factor_pending_secret': '',
          'security.two_factor_recovery_code_hashes': hashes,
          'security.two_factor_last_step': step,
          'security.failed_login_attempts': 0,
          'security.locked_until': null,
        },
      }
    );
    if (res.modifiedCount !== 1) throw badInput('Start the setup again — scan a new QR code.');
    logs.server.info('two-factor', 'enable', { msg: 'authenticator sign-in turned on', user_id: userId });
    return codes;
  },

  /** Off again — only with a current code, so a borrowed session cannot strip it. */
  async disable(userId: string, rawCode: string): Promise<void> {
    const user = await accountWithSecrets(userId);
    if (!user.security?.two_factor_enabled) throw badInput('Authenticator app sign-in is not on.');
    await proveSecondFactor(user, rawCode);
    await UserModel.updateOne({ _id: user._id }, { $set: CLEARED });
    logs.server.info('two-factor', 'disable', { msg: 'authenticator sign-in turned off', user_id: userId });
  },

  /**
   * The gate every console door runs once the first factor is proved.
   *
   * Throws TWO_FACTOR_REQUIRED, carrying the challenge the client trades back
   * with the code, instead of letting the door mint a session. The console's
   * role check runs first: an account this console would refuse anyway is
   * refused now, not after typing a code.
   */
  async requireForPortal(
    user: TwoFactorAccount | null,
    door: Readonly<{ provider: SignInProvider; portalKey?: string | null }>
  ): Promise<void> {
    const portalKey = String(door.portalKey ?? '').trim();
    if (!user || !portalKey || !user.security?.two_factor_enabled) return;
    const pub = await toPublic(user);
    assertPortalLogin(portalKey, pub?.roles ?? []);
    throw new GraphQLError('Enter the code from your authenticator app.', {
      extensions: {
        code: 'TWO_FACTOR_REQUIRED',
        challenge_token: signChallenge({ userId: String(user._id), provider: door.provider, portalKey }),
        expires_in_seconds: CHALLENGE_TTL_SECONDS,
      },
    });
  },

  /** The second half of a console sign-in: a correct code opens the session the door held back. */
  async completeLogin(
    input: Readonly<{ challenge_token: string; code: string }>,
    signIn?: SignInContext
  ) {
    const challenge = verifyChallenge(input.challenge_token);
    const user = await accountWithSecrets(challenge.userId);
    const expired = () =>
      new GraphQLError('This sign-in has expired. Sign in again.', {
        extensions: { code: 'TWO_FACTOR_CHALLENGE_EXPIRED' },
      });
    // Re-checked, not trusted from the challenge: in five minutes an account
    // can be sealed, suspended or have the feature turned off.
    if (isAccountLocked(String(user._id)) || !user.security?.two_factor_enabled) throw expired();
    if (user.metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    await proveSecondFactor(user, input.code);
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { 'auth.last_login_provider': challenge.provider, 'auth.last_login_at': new Date() } }
    );
    const fresh = await UserModel.findById(user._id);
    if (!fresh) throw expired();
    const payload = await authPayload(fresh);
    // Roles can be revoked between the two steps; this is the moment that grants the session.
    assertPortalLogin(challenge.portalKey, payload.user.roles);
    noteSignIn(fresh, signIn ?? {}).catch(() => undefined);
    return payload;
  },
};
