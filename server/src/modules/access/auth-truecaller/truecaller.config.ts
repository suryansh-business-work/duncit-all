/**
 * Where Truecaller lives, and which Duncit app it knows us as.
 *
 * Every identifier comes from Tech → Environment → Truecaller; nothing here is
 * a credential (the client ID ships in the APK, the app key in the iOS app).
 * The hosts are Truecaller's, split by data region — the EU stack is a
 * separate deployment with its own tokens, so a code from one is meaningless
 * on the other.
 */
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

const OAUTH_HOSTS = {
  noneu: 'https://oauth-account-noneu.truecaller.com',
  eu: 'https://oauth-account-eu.truecaller.com',
} as const;

export type TruecallerRegion = keyof typeof OAUTH_HOSTS;

/** The Android OAuth SDK's code exchange and the profile behind its token. */
export const truecallerOAuthUrls = (region: TruecallerRegion) => ({
  token: `${OAUTH_HOSTS[region]}/v1/token`,
  userinfo: `${OAUTH_HOSTS[region]}/v1/userinfo`,
});

/** The public keys the iOS SDK's signed profile is checked against. */
export const TRUECALLER_PUBLIC_KEY_URL = 'https://api4.truecaller.com/v1/key';

/**
 * The only hosts a mobile-web callback may send us to for the profile.
 *
 * The callback is an unauthenticated POST — anybody can make one. What makes
 * its answer trustworthy is that the profile is fetched from Truecaller with
 * the token it carries; a callback naming any other host could hand us a
 * profile it wrote itself.
 */
export function isTruecallerProfileUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname.endsWith('.truecaller.com');
  } catch {
    return false;
  }
}

export interface TruecallerConfig {
  androidClientId: string;
  appKey: string;
  partnerName: string;
  region: TruecallerRegion;
}

export async function truecallerConfig(): Promise<TruecallerConfig> {
  const [androidClientId, appKey, partnerName, region] = await Promise.all([
    getRuntimeEnvValue('TRUECALLER_ANDROID_CLIENT_ID'),
    getRuntimeEnvValue('TRUECALLER_APP_KEY'),
    getRuntimeEnvValue('TRUECALLER_PARTNER_NAME'),
    getRuntimeEnvValue('TRUECALLER_REGION'),
  ]);
  return {
    androidClientId: androidClientId.trim(),
    appKey: appKey.trim(),
    partnerName: partnerName.trim(),
    region: region.trim().toLowerCase() === 'eu' ? 'eu' : 'noneu',
  };
}

export function truecallerNotConfigured(): GraphQLError {
  return new GraphQLError('Truecaller sign-in is not set up yet', {
    extensions: { code: 'NOT_CONFIGURED' },
  });
}

/** Truecaller answered, but not with a usable verification. */
export function truecallerRejected(reason: string): GraphQLError {
  return new GraphQLError('Truecaller could not verify this number — try another way', {
    extensions: { code: 'TRUECALLER_REJECTED', reason },
  });
}
