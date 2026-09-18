import { createPublicKey, type JsonWebKeyInput, type KeyObject } from 'node:crypto';
import { GraphQLError } from 'graphql';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { fetchIdentityUpstream } from './auth.upstream';
import type { SocialIdentity } from './auth.social';

/**
 * Sign in with Apple, server side.
 *
 * Apple has no tokeninfo endpoint to ask. Its id_token is a JWT signed with one
 * of the keys Apple publishes, so it is verified HERE: the signature against
 * that key, the issuer, the expiry, and the audience — which is the App ID for
 * a token the iOS app obtained natively, and the Services ID for one that came
 * through the web flow (mWeb, and the Android app via the /apple relay). Either
 * is ours; anything else was minted for somebody else's app.
 *
 * All the values come from Tech → Environment Variables → Sign in with Apple.
 */

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

/** Apple rotates its keys rarely; a day is long enough to cache them and short enough to notice. */
const KEYS_TTL_MS = 24 * 60 * 60 * 1000;

type AppleJwk = JsonWebKeyInput['key'] & { kid: string };

let signingKeys: { at: number; byKid: Map<string, KeyObject> } | null = null;

function invalidCredential(): GraphQLError {
  return new GraphQLError('Invalid Apple credential', { extensions: { code: 'UNAUTHENTICATED' } });
}

async function loadSigningKeys(): Promise<Map<string, KeyObject>> {
  const res = await fetchIdentityUpstream(APPLE_KEYS_URL, { event: 'apple-keys', provider: 'Apple' });
  if (!res.ok) {
    throw new GraphQLError('Could not reach Apple to verify your sign-in. Please try again.', {
      extensions: { code: 'UPSTREAM_UNAVAILABLE' },
    });
  }
  const body = (await res.json()) as { keys?: AppleJwk[] };
  const byKid = new Map(
    (body.keys ?? []).map((jwk) => [jwk.kid, createPublicKey({ key: jwk, format: 'jwk' })] as const)
  );
  signingKeys = { at: Date.now(), byKid };
  return byKid;
}

/**
 * Apple's public key for `kid`. A kid the cached set does not hold refreshes it
 * once before the token is refused — that is what a rotation looks like from
 * here.
 */
async function appleSigningKey(kid: string): Promise<KeyObject> {
  const fresh = signingKeys !== null && Date.now() - signingKeys.at < KEYS_TTL_MS;
  const cached = fresh ? signingKeys?.byKid.get(kid) : undefined;
  if (cached) return cached;
  const key = (await loadSigningKeys()).get(kid);
  if (!key) throw invalidCredential();
  return key;
}

/** The audiences an Apple token may carry: the App ID (iOS) and the Services ID (web). */
async function appleAudiences(): Promise<string[]> {
  const values = await Promise.all([
    getRuntimeEnvValue('APPLE_BUNDLE_ID'),
    getRuntimeEnvValue('APPLE_SERVICES_ID'),
  ]);
  return values.map((v) => v.trim()).filter(Boolean);
}

/**
 * Verify an Apple id_token and return who it proves.
 *
 * The email is the one Apple vouches for — the person's own, or a private relay
 * address when they chose Hide My Email. Apple never puts the NAME in the
 * token; it hands it to the client once, on the first authorisation, and the
 * client carries it to signup.
 */
export async function verifyAppleIdToken(idToken: string): Promise<SocialIdentity> {
  if (!idToken) {
    throw new GraphQLError('Apple id_token is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const audiences = await appleAudiences();
  if (audiences.length === 0) {
    throw new GraphQLError('Apple sign-in is not configured on the server', {
      extensions: { code: 'NOT_CONFIGURED' },
    });
  }
  const kid = jwt.decode(idToken, { complete: true })?.header.kid;
  if (!kid) throw invalidCredential();
  const key = await appleSigningKey(kid);

  let claims: JwtPayload;
  try {
    claims = jwt.verify(idToken, key, {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      audience: audiences as [string, ...string[]],
    }) as JwtPayload;
  } catch {
    throw invalidCredential();
  }

  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  const verified =
    claims.email_verified === true || String(claims.email_verified).toLowerCase() === 'true';
  if (!claims.sub || !email || !verified) {
    throw new GraphQLError('Apple did not share a verified email address', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return { sub: claims.sub, email };
}

/**
 * The .p8 key as PEM. The Tech portal's box is a single-line input and a
 * browser drops the newlines from anything pasted into one, so the key usually
 * arrives as one long line with its BEGIN/END markers run into the body.
 */
export function applePrivateKeyPem(raw: string): string {
  const body = raw.replaceAll(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replaceAll(/\s+/g, '');
  const lines = body.match(/.{1,64}/g) ?? [];
  return ['-----BEGIN PRIVATE KEY-----', ...lines, '-----END PRIVATE KEY-----'].join('\n');
}

export interface AppleKeyCredentials {
  teamId: string;
  keyId: string;
  /** The Services ID or App ID the secret is for. */
  clientId: string;
  privateKey: string;
}

/**
 * The client secret Apple's token endpoint asks for: a short-lived ES256 JWT
 * signed with the Sign in with Apple key. Throws when the key cannot sign.
 */
export function appleClientSecret(creds: AppleKeyCredentials): string {
  return jwt.sign({}, applePrivateKeyPem(creds.privateKey), {
    algorithm: 'ES256',
    keyid: creds.keyId,
    issuer: creds.teamId,
    subject: creds.clientId,
    audience: APPLE_ISSUER,
    expiresIn: '5m',
  });
}
