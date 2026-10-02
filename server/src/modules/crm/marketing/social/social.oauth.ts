import { createHash, randomUUID } from 'node:crypto';
import { purposeDigest, signedLink } from '@utils/signed-link';
import { SOCIAL_CONNECT_RETURNS, SOCIAL_PROVIDERS, type SocialConnectReturn, type SocialProvider } from './social.types';

/**
 * The `state` a provider hands back, and the PKCE pair X asks for.
 *
 * The state is signed and short-lived, so the callback can prove the round
 * trip started here, by whom, for which provider and from which page — ten
 * minutes is longer than any consent screen takes and shorter than a link
 * worth replaying.
 *
 * The PKCE verifier is derived from the state's nonce with a server-only key
 * rather than stored: the callback recomputes it, and it never travels in a
 * URL the way the state itself does.
 */
const STATE_TTL_MS = 10 * 60_000;
const stateLink = signedLink('social_connect', STATE_TTL_MS);
const PROVIDERS = new Set<string>(SOCIAL_PROVIDERS);
const isProvider = (value: string): value is SocialProvider => PROVIDERS.has(value);
const RETURNS = new Set<string>(SOCIAL_CONNECT_RETURNS);
const isReturn = (value: string): value is SocialConnectReturn => RETURNS.has(value);

const verifierFor = (nonce: string) => purposeDigest('social_pkce', nonce);
const challengeFor = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

export interface ConnectStart {
  state: string;
  challenge: string;
}

export function startConnect(provider: SocialProvider, userId: string, returnTo: SocialConnectReturn): ConnectStart {
  const nonce = randomUUID();
  return {
    state: stateLink.sign(`${provider}.${userId}.${nonce}.${returnTo}`),
    challenge: challengeFor(verifierFor(nonce)),
  };
}

export interface ConnectState {
  provider: SocialProvider;
  userId: string;
  verifier: string;
  returnTo: SocialConnectReturn;
}

/** The state's contents, or null when it is forged, stale or malformed. */
export function readConnectState(state: string): ConnectState | null {
  const payload = stateLink.verify(state);
  if (!payload) return null;
  const [provider, userId, nonce, returnTo] = payload.split('.');
  if (!isProvider(provider) || !userId || !nonce || !isReturn(returnTo)) return null;
  return { provider, userId, verifier: verifierFor(nonce), returnTo };
}
