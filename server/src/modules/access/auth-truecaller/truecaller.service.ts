/**
 * Continue with Truecaller — one door for login AND signup.
 *
 * Truecaller proves which number the person is holding. That is exactly what
 * the WhatsApp code proves today, so this file does not open sessions or
 * create accounts itself: it turns a checked Truecaller verification into the
 * same one-shot proof a typed code earns (`otpService.attest`), and hands it
 * to the doors that already spend such proofs.
 *
 *  - The number reaches an account → a LOGIN proof, spent at once by the OTP
 *    login's own second half: same sealed/active checks, same session.
 *  - It reaches nobody → a WHATSAPP_SIGNUP proof goes back to the client,
 *    which skips the code step and signs up exactly as after a code.
 */
import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { userService } from '@modules/access/user/user.service';
import { accountFor } from '@modules/access/auth/password-reset.service';
import { otpService } from '@modules/platform/otp/otp.service';
import { isDuplicateKeyError } from '@utils/mongo-error';
import type { SignInContext } from '@modules/access/user/user.signin';
import { truecallerRejected } from './truecaller.config';
import type { TruecallerIdentity } from './truecaller.identity';
import { TRUECALLER_REQUEST_TTL_MS, TruecallerRequestModel } from './truecaller.model';
import { fetchWebProfile, verifyAndroidCode, verifyIosProfile } from './truecaller.verify';
import {
  claimWebRequest,
  startWebRequest,
  webRequestState,
  type TruecallerIntent,
} from './truecaller.web';

export interface TruecallerAuthInput {
  platform: 'ANDROID' | 'IOS' | 'WEB';
  authorization_code?: string | null;
  code_verifier?: string | null;
  payload?: string | null;
  signature?: string | null;
  signature_algorithm?: string | null;
  request_nonce?: string | null;
}

const MAX_FIELD = 8192;

function required(value: string | null | undefined, field: string): string {
  const text = String(value ?? '').trim();
  if (!text || text.length > MAX_FIELD) {
    throw new GraphQLError(`${field} is required`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return text;
}

/** A signed iOS profile opens one session, ever. */
async function spendIosProfile(payload: string): Promise<void> {
  try {
    await TruecallerRequestModel.create({
      key: crypto.createHash('sha256').update(payload).digest('hex'),
      kind: 'IOS',
      state: 'USED',
      expires_at: new Date(Date.now() + TRUECALLER_REQUEST_TTL_MS),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw truecallerRejected('profile already used');
    throw error;
  }
}

async function identityOf(input: Readonly<TruecallerAuthInput>): Promise<TruecallerIdentity> {
  if (input.platform === 'ANDROID') {
    return verifyAndroidCode(
      required(input.authorization_code, 'authorization_code'),
      required(input.code_verifier, 'code_verifier')
    );
  }
  if (input.platform === 'IOS') {
    const payload = required(input.payload, 'payload');
    const identity = await verifyIosProfile(
      payload,
      required(input.signature, 'signature'),
      required(input.signature_algorithm, 'signature_algorithm')
    );
    await spendIosProfile(payload);
    return identity;
  }
  const claimed = await claimWebRequest(required(input.request_nonce, 'request_nonce'));
  if (!claimed?.access_token) {
    throw new GraphQLError('That Truecaller request has expired — start again', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return fetchWebProfile(claimed.access_token, claimed.endpoint);
}

export const truecallerAuthService = {
  startWeb: (intent: TruecallerIntent, lang?: string | null) => startWebRequest(intent, String(lang ?? '')),

  async webState(nonce: string) {
    return webRequestState(required(nonce, 'request_nonce'));
  },

  async continueWithTruecaller(input: Readonly<TruecallerAuthInput>, signIn?: SignInContext) {
    const identity = await identityOf(input);
    const target = { phone_extension: identity.phone_extension, phone_number: identity.phone_number };
    const user = await accountFor(target);
    if (user) {
      const { challenge } = await otpService.attest('LOGIN', target, {
        user_id: String(user._id),
        attested_by: 'TRUECALLER',
      });
      const auth = await userService.loginWithProvenChallenge(challenge, 'TRUECALLER', signIn);
      return { status: 'SIGNED_IN' as const, auth, signup: null };
    }
    const { token } = await otpService.attest('WHATSAPP_SIGNUP', target, { attested_by: 'TRUECALLER' });
    return {
      status: 'SIGNUP_REQUIRED' as const,
      auth: null,
      signup: { whatsapp_token: token, ...identity },
    };
  },
};
