import type { DiscoveredAccount, ProbeOutcome, SocialAppCredentials, SocialConnector, SocialTokens } from '../social.types';
import { count, postForm, socialJson, withQuery } from './http';

/**
 * The Facebook app, through Facebook Login for Business: one consent hands
 * back every Facebook Page the person manages. Instagram has an app and a
 * login of its own now (instagram.ts); an Instagram account connected through
 * Facebook before that keeps working on its Page token, with provider FACEBOOK.
 *
 * The short-lived user token is swapped for a long-lived one first, because
 * Page tokens read with a long-lived user token do not expire — so a Page
 * stays connected until someone removes the app, not for an hour.
 */
export const FACEBOOK_SERVICE = 'Facebook';
/** The name this app went by while it served Instagram too. */
export const META_SERVICE = FACEBOOK_SERVICE;
export const INSTAGRAM_SERVICE = 'Instagram';

export const FACEBOOK_GRAPH = 'https://graph.facebook.com';
/** The only host that honours a token from Instagram Login. */
export const INSTAGRAM_GRAPH = 'https://graph.instagram.com';

/** Read Pages, posts, comments and insights; post to Pages. */
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_posts',
  'read_insights',
  'business_management',
];

export const graphUrl = (version: string, path: string, base = FACEBOOK_GRAPH) => `${base}/${version}${path}`;

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
 * Facebook issues an APP token for the ID and secret alone, so this is a real
 * check of the pair — and the app's name comes back to show which app it is.
 */
export async function probeFacebookApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
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
    return { ok: true, message: `Facebook accepted the App ID and Secret${named}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Facebook rejected the App ID or Secret — ${reason}` };
  }
}
/** The probe's name while the app served Instagram too. */
export const probeMetaApp = probeFacebookApp;

/** Graph stamps times as `2026-09-20T10:15:00+0000`; the colon makes it ISO 8601. */
export const graphTime = (value?: string): Date =>
  value ? new Date(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')) : new Date();

interface TokenResponse {
  access_token: string;
}

interface Page {
  id: string;
  name?: string;
  username?: string;
  link?: string;
  access_token: string;
  followers_count?: number;
  fan_count?: number;
  picture?: { data?: { url?: string } };
}

const PAGE_FIELDS = 'id,name,username,link,access_token,followers_count,fan_count,picture{url}';

const pageToken = (page: Page): SocialTokens => ({
  access_token: page.access_token,
  refresh_token: '',
  expires_at: null,
  scopes: SCOPES,
});

function facebookAccount(page: Page): DiscoveredAccount {
  return {
    platform: 'FACEBOOK',
    external_id: page.id,
    name: page.name ?? page.username ?? page.id,
    handle: page.username ?? '',
    avatar_url: page.picture?.data?.url ?? '',
    profile_url: page.link ?? `https://www.facebook.com/${page.id}`,
    followers: count(page.followers_count ?? page.fan_count),
    tokens: pageToken(page),
    meta: {},
  };
}

export const facebookConnector: SocialConnector = {
  authorizeUrl: ({ creds, state }) =>
    withQuery(`https://www.facebook.com/${creds.version}/dialog/oauth`, {
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      state,
      response_type: 'code',
      scope: SCOPES.join(','),
    }),

  async connect({ code, creds }) {
    const short = await socialJson<TokenResponse>(
      FACEBOOK_SERVICE,
      withQuery(graphUrl(creds.version, '/oauth/access_token'), {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: creds.redirectUri,
        code,
      })
    );
    const long = await socialJson<TokenResponse>(
      FACEBOOK_SERVICE,
      withQuery(graphUrl(creds.version, '/oauth/access_token'), {
        grant_type: 'fb_exchange_token',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        fb_exchange_token: short.access_token,
      })
    );
    const pages = await graphGet<{ data?: Page[] }>(creds.version, '/me/accounts', long.access_token, {
      fields: PAGE_FIELDS,
      limit: '100',
    });
    return (pages.data ?? []).map(facebookAccount);
  },
};
/** The connector's name while the app served Instagram too. */
export const metaConnector = facebookConnector;
