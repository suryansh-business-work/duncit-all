import type { ProbeOutcome, SocialAppCredentials } from '../social.types';
import { postForm, socialJson, withQuery } from './http';

/**
 * The Graph API helpers every Meta network shares: the hosts, the names the
 * errors carry, GET/POST/DELETE with the token where Graph takes it, and the
 * App ID / Secret probe. The connect itself is meta.login.ts.
 */
export const FACEBOOK_SERVICE = 'Facebook';
/** The name this app went by while it served Instagram too. */
export const META_SERVICE = FACEBOOK_SERVICE;
export const INSTAGRAM_SERVICE = 'Instagram';

export const FACEBOOK_GRAPH = 'https://graph.facebook.com';
/** The only host that honours a token from Instagram Login. */
export const INSTAGRAM_GRAPH = 'https://graph.instagram.com';

export const graphUrl = (version: string, path: string, base = FACEBOOK_GRAPH) => `${base}/${version}${path}`;

/**
 * `meta.login` on an account connected through Facebook Login for Business
 * (Meta's "Unified login"): its token — a Page token, or the login's own — is
 * honoured on graph.facebook.com, whichever button started the connect.
 */
export const FACEBOOK_LOGIN = 'FACEBOOK';
export const isFacebookLogin = (meta: Record<string, unknown> | null | undefined): boolean => meta?.login === FACEBOOK_LOGIN;

/** Each host answers for its own app, so an error names the app whose token was refused. */
const serviceOf = (base: string) => (base === INSTAGRAM_GRAPH ? INSTAGRAM_SERVICE : FACEBOOK_SERVICE);

/** Graph GET with the token as a query parameter, which is how the Graph API takes it. */
export function graphGet<T>(
  version: string,
  path: string,
  token: string,
  params: Record<string, string> = {},
  base = FACEBOOK_GRAPH
): Promise<T> {
  return socialJson<T>(serviceOf(base), withQuery(graphUrl(version, path, base), { ...params, access_token: token }));
}

/** Graph POST, form-encoded, token in the body. */
export function graphPost<T>(
  version: string,
  path: string,
  token: string,
  params: Record<string, string>,
  base = FACEBOOK_GRAPH
): Promise<T> {
  return postForm<T>(serviceOf(base), graphUrl(version, path, base), { ...params, access_token: token });
}

/**
 * A carousel on a Meta-shaped publishing API (Instagram, Threads): one
 * container per item, each marked a carousel item and waited for in turn,
 * then the parent container naming them all. `make` creates one container
 * and hands back its id once the network has it ready.
 */
export async function carouselContainer(
  items: readonly Record<string, string>[],
  parent: Record<string, string>,
  make: (fields: Record<string, string>) => Promise<string>
): Promise<string> {
  const children: string[] = [];
  for (const item of items) children.push(await make({ ...item, is_carousel_item: 'true' }));
  return make({ media_type: 'CAROUSEL', children: children.join(','), ...parent });
}

/** Graph DELETE with the token as a query parameter. */
export function graphDelete<T>(version: string, path: string, token: string, base = FACEBOOK_GRAPH): Promise<T> {
  return socialJson<T>(serviceOf(base), withQuery(graphUrl(version, path, base), { access_token: token }), { method: 'DELETE' });
}

/**
 * Facebook issues an APP token for the ID and secret alone, so this is a real
 * check of the pair — and the app's name comes back to show which app it is.
 */
export async function probeMetaAppPair(creds: SocialAppCredentials, label: string): Promise<ProbeOutcome> {
  try {
    const token = await socialJson<TokenResponse>(
      FACEBOOK_SERVICE,
      withQuery(graphUrl(creds.version, '/oauth/access_token'), {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'client_credentials',
      })
    );
    const app = await graphGet<{ name?: string }>(creds.version, `/${creds.clientId}`, token.access_token, { fields: 'name' });
    const named = app.name ? ` (${app.name})` : '';
    return { ok: true, message: `${label} accepted the App ID and Secret${named}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `${label} rejected the App ID or Secret — ${reason}` };
  }
}

export const probeFacebookApp = (creds: SocialAppCredentials): Promise<ProbeOutcome> => probeMetaAppPair(creds, 'Facebook');
/** The probe's name while the app served Instagram too. */
export const probeMetaApp = probeFacebookApp;

/** Graph stamps times as `2026-09-20T10:15:00+0000`; the colon makes it ISO 8601. */
export const graphTime = (value?: string): Date =>
  value ? new Date(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')) : new Date();

interface TokenResponse {
  access_token: string;
}
