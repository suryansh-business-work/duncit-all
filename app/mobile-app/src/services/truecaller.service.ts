import type { TruecallerSignupProof } from '@duncit/utils';

import { LoginWithTruecallerDocument, TruecallerConfigDocument } from '@/graphql/truecaller';
import { TruecallerAuthStatus, TruecallerPlatform } from '@/generated/graphql/graphql';
import { graphqlRequest } from './graphql.client';
import { setAuthToken } from './auth-token';
import type { AuthOutcome } from './auth.service';

export interface TruecallerIds {
  androidClientId: string;
  iosAppKey: string;
  iosAppLink: string;
}

/** What Tech → Environment → Truecaller holds for the apps. Blank when unset. */
export async function truecallerIds(): Promise<TruecallerIds> {
  const data = await graphqlRequest(TruecallerConfigDocument);
  const c = data.publicClientConfig;
  return {
    androidClientId: c.truecaller_android_client_id.trim(),
    iosAppKey: c.truecaller_app_key.trim(),
    iosAppLink: c.truecaller_ios_app_link.trim(),
  };
}

/** What a Truecaller SDK handed back — re-checked with Truecaller by the server. */
export type TruecallerProofInput =
  | { platform: 'ANDROID'; authorizationCode: string; codeVerifier: string }
  | { platform: 'IOS'; payload: string; signature: string; signatureAlgorithm: string };

/** The server answered with neither half — never expected, so it carries no copy. */
export class TruecallerNoAnswer extends Error {}

export type TruecallerOutcome =
  | { kind: 'SIGNED_IN'; auth: AuthOutcome }
  | { kind: 'SIGNUP_REQUIRED'; proof: TruecallerSignupProof };

const inputOf = (proof: TruecallerProofInput) =>
  proof.platform === 'ANDROID'
    ? {
        platform: TruecallerPlatform.Android,
        authorization_code: proof.authorizationCode,
        code_verifier: proof.codeVerifier,
      }
    : {
        platform: TruecallerPlatform.Ios,
        payload: proof.payload,
        signature: proof.signature,
        signature_algorithm: proof.signatureAlgorithm,
      };

/**
 * Continue with Truecaller. A known number comes back signed in (the token is
 * stored here, like every other login); a new one comes back with the proof
 * that lets signup skip the WhatsApp code. mWeb twin: useTruecallerWeb.
 */
export async function loginWithTruecaller(proof: TruecallerProofInput): Promise<TruecallerOutcome> {
  const data = await graphqlRequest(LoginWithTruecallerDocument, { input: inputOf(proof) });
  const result = data.loginWithTruecaller;
  if (result.status === TruecallerAuthStatus.SignedIn && result.auth) {
    await setAuthToken(result.auth.token);
    return {
      kind: 'SIGNED_IN',
      auth: {
        token: result.auth.token,
        surveyCompleted: result.auth.user.onboarding_survey_completed,
      },
    };
  }
  // Neither a session nor a proof: the caller shows its own "failed" line.
  if (!result.signup) throw new TruecallerNoAnswer();
  return { kind: 'SIGNUP_REQUIRED', proof: result.signup };
}
