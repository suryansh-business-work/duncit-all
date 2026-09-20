import type { DiscoveredAccount, ProbeOutcome, SocialAppCredentials, SocialConnector, SocialTokens } from '../social.types';
import { count, postForm, socialJson, withQuery } from './http';

/**
 * Facebook Login for Business: one consent hands back every Facebook Page the
 * person manages AND the Instagram Business account linked to each one.
 *
 * The short-lived user token is swapped for a long-lived one first, because
 * Page tokens read with a long-lived user token do not expire — so a Page (and
 * its Instagram account, which is read with the same Page token) stays
 * connected until someone removes the app, not for an hour.
 */
export const META_SERVICE = 'Meta';

/** Read Pages, posts, comments and insights; post to Pages and Instagram. */
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_posts',
  'read_insights',
  'business_management',
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'instagram_content_publish',
];

export const graphUrl = (version: string, path: string) => `https://graph.facebook.com/${version}${path}`;

/** Graph GET with the token as a query parameter, which is how the Graph API takes it. */
export function graphGet<T>(version: string, path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  return socialJson<T>(META_SERVICE, withQuery(graphUrl(version, path), { ...params, access_token: token }));
}

/** Graph POST, form-encoded, token in the body. */
export function graphPost<T>(version: string, path: string, token: string, params: Record<string, string>): Promise<T> {
  return postForm<T>(META_SERVICE, graphUrl(version, path), { ...params, access_token: token });
}

/**
 * Meta issues an APP token for the ID and secret alone, so this is a real
 * check of the pair — and the app's name comes back to show which app it is.
 */
export async function probeMetaApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
  try {
    const token = await socialJson<TokenResponse>(
      META_SERVICE,
      withQuery(graphUrl(creds.version, '/oauth/access_token'), {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'client_credentials',
      })
    );
    const app = await graphGet<{ name?: string }>(creds.version, `/${creds.clientId}`, token.access_token, { fields: 'name' });
    const named = app.name ? ` (${app.name})` : '';
    return { ok: true, message: `Meta accepted the App ID and Secret${named}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Meta rejected the App ID or Secret — ${reason}` };
  }
}

/** Graph stamps times as `2026-09-20T10:15:00+0000`; the colon makes it ISO 8601. */
export const graphTime = (value?: string): Date =>
  value ? new Date(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')) : new Date();

interface TokenResponse {
  access_token: string;
}

interface InstagramBusiness {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
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
  instagram_business_account?: InstagramBusiness;
}

const PAGE_FIELDS =
  'id,name,username,link,access_token,followers_count,fan_count,picture{url},' +
  'instagram_business_account{id,username,name,profile_picture_url,followers_count}';

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

function instagramAccount(page: Page, ig: InstagramBusiness): DiscoveredAccount {
  const username = ig.username ?? '';
  return {
    platform: 'INSTAGRAM',
    external_id: ig.id,
    name: ig.name || username,
    handle: username,
    avatar_url: ig.profile_picture_url ?? '',
    profile_url: username ? `https://www.instagram.com/${username}` : '',
    followers: count(ig.followers_count),
    tokens: pageToken(page),
    meta: { page_id: page.id },
  };
}

export const metaConnector: SocialConnector = {
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
      META_SERVICE,
      withQuery(graphUrl(creds.version, '/oauth/access_token'), {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: creds.redirectUri,
        code,
      })
    );
    const long = await socialJson<TokenResponse>(
      META_SERVICE,
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
    return (pages.data ?? []).flatMap((page) => {
      const ig = page.instagram_business_account;
      return ig ? [facebookAccount(page), instagramAccount(page, ig)] : [facebookAccount(page)];
    });
  },
};
