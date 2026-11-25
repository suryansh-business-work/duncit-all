import type { DiscoveredAccount, ProbeOutcome, SocialAppCredentials, SocialConnector, SocialTokens } from '../social.types';
import { count, expiresAt, socialJson, withQuery } from './http';
import {
  FACEBOOK_GRAPH,
  FACEBOOK_LOGIN,
  FACEBOOK_SERVICE,
  INSTAGRAM_GRAPH,
  graphDelete,
  graphGet,
  graphUrl,
  isFacebookLogin,
  probeMetaAppPair,
} from './meta';

/**
 * Instagram and Facebook, through Facebook Login for Business — Meta's
 * "API setup with Unified login", the only way a newer Meta app connects an
 * Instagram professional account. Both Connect buttons start this one flow:
 * one consent hands back every Page the person picked and the Instagram
 * account linked to each, stored as two linked accounts (`meta.page_id` /
 * `meta.instagram_id`).
 *
 * With a Login configuration (`config_id`) Meta takes the permissions and the
 * asset picker from it and `scope` must not be sent. A configuration that
 * issues a system-user token hands back one that never expires, kept as it
 * came; any other user token is swapped for a long-lived one first, because a
 * Page token read with a long-lived user token does not expire.
 */

/** Asked for only when no Login configuration is set: Pages, plus Instagram through its linked Page. */
export const META_LOGIN_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_posts',
  'read_insights',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'instagram_manage_messages',
];

/** The permissions whose granted targets name Pages, and those that name Instagram accounts. */
const PAGE_ASSET_SCOPES = new Set(['pages_show_list', 'pages_messaging', 'pages_manage_metadata', 'pages_read_engagement', 'pages_manage_posts']);
const INSTAGRAM_ASSET_SCOPES = new Set([
  'instagram_basic',
  'instagram_manage_messages',
  'instagram_manage_comments',
  'instagram_content_publish',
  'instagram_manage_insights',
]);

const IG_FIELDS = 'id,username,name,profile_picture_url,followers_count';
const PAGE_FIELDS = `id,name,username,link,access_token,followers_count,fan_count,picture{url},instagram_business_account{${IG_FIELDS}}`;

interface IssuedToken {
  access_token: string;
  expires_in?: number;
}

/** What Meta says about a token: what it may do, on which assets, and until when (0 = never expires). */
export interface TokenDebug {
  /** False once Meta has revoked the token (password change, removed app, lapsed). */
  is_valid?: boolean;
  scopes?: string[];
  granular_scopes?: { scope: string; target_ids?: string[] }[];
  expires_at?: number;
}

interface InstagramAccount {
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
  access_token?: string;
  followers_count?: number;
  fan_count?: number;
  picture?: { data?: { url?: string } };
  instagram_business_account?: InstagramAccount;
}

interface UserToken {
  token: string;
  expires: Date | null;
  debug: TokenDebug;
}

/** `GET /debug_token`, asked with the app's own token (`app-id|app-secret`). */
export async function debugToken(creds: SocialAppCredentials, token: string): Promise<TokenDebug> {
  const res = await socialJson<{ data?: TokenDebug }>(
    FACEBOOK_SERVICE,
    withQuery(graphUrl(creds.version, '/debug_token'), { input_token: token, access_token: `${creds.clientId}|${creds.clientSecret}` })
  );
  return res.data ?? {};
}

const tokenUrl = (creds: SocialAppCredentials, params: Record<string, string>) =>
  withQuery(graphUrl(creds.version, '/oauth/access_token'), { client_id: creds.clientId, client_secret: creds.clientSecret, ...params });

async function userTokenOf(code: string, creds: SocialAppCredentials): Promise<UserToken> {
  const issued = await socialJson<IssuedToken>(FACEBOOK_SERVICE, tokenUrl(creds, { redirect_uri: creds.redirectUri, code }));
  const debug = await debugToken(creds, issued.access_token);
  if (debug.expires_at === 0) return { token: issued.access_token, expires: null, debug };
  const long = await socialJson<IssuedToken>(
    FACEBOOK_SERVICE,
    tokenUrl(creds, { grant_type: 'fb_exchange_token', fb_exchange_token: issued.access_token })
  );
  return { token: long.access_token, expires: expiresAt(long.expires_in), debug };
}

/** The asset ids the person granted for any of these permissions. */
const grantedIds = (debug: TokenDebug, scopes: ReadonlySet<string>): string[] => [
  ...new Set((debug.granular_scopes ?? []).filter((grant) => scopes.has(grant.scope)).flatMap((grant) => grant.target_ids ?? [])),
];

/** The Pages the login reaches. A system-user token lists none under `/me/accounts`; its grant names them instead. */
async function pagesOf(creds: SocialAppCredentials, user: UserToken): Promise<Page[]> {
  const listed = await graphGet<{ data?: Page[] }>(creds.version, '/me/accounts', user.token, { fields: PAGE_FIELDS, limit: '100' });
  if (listed.data?.length) return listed.data;
  return Promise.all(grantedIds(user.debug, PAGE_ASSET_SCOPES).map((id) => graphGet<Page>(creds.version, `/${id}`, user.token, { fields: PAGE_FIELDS })));
}

const tokensOf = (access_token: string, expires_at: Date | null, scopes: string[]): SocialTokens => ({
  access_token,
  refresh_token: '',
  expires_at,
  scopes,
});

function instagramAccount(ig: InstagramAccount, tokens: SocialTokens, pageId: string): DiscoveredAccount {
  const username = ig.username ?? '';
  return {
    platform: 'INSTAGRAM',
    external_id: ig.id,
    name: ig.name || username || ig.id,
    handle: username,
    avatar_url: ig.profile_picture_url ?? '',
    profile_url: username ? `https://www.instagram.com/${username}` : '',
    followers: count(ig.followers_count),
    tokens,
    meta: { login: FACEBOOK_LOGIN, page_id: pageId },
  };
}

/** The Page, and the Instagram account linked to it, both on the Page's token (the login's own when Graph sent none). */
function pageAccounts(page: Page, user: UserToken, scopes: string[]): DiscoveredAccount[] {
  const tokens = page.access_token ? tokensOf(page.access_token, null, scopes) : tokensOf(user.token, user.expires, scopes);
  const ig = page.instagram_business_account;
  const facebook: DiscoveredAccount = {
    platform: 'FACEBOOK',
    external_id: page.id,
    name: page.name ?? page.username ?? page.id,
    handle: page.username ?? '',
    avatar_url: page.picture?.data?.url ?? '',
    profile_url: page.link ?? `https://www.facebook.com/${page.id}`,
    followers: count(page.followers_count ?? page.fan_count),
    tokens,
    meta: { login: FACEBOOK_LOGIN, instagram_id: ig?.id ?? '' },
  };
  return ig ? [facebook, instagramAccount(ig, tokens, page.id)] : [facebook];
}

export const metaLoginConnector: SocialConnector = {
  authorizeUrl: ({ creds, state }) =>
    withQuery(`https://www.facebook.com/${creds.version}/dialog/oauth`, {
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      state,
      response_type: 'code',
      config_id: creds.configId || undefined,
      scope: creds.configId ? undefined : META_LOGIN_SCOPES.join(','),
    }),

  async connect({ code, creds }) {
    const user = await userTokenOf(code, creds);
    const scopes = user.debug.scopes ?? [];
    const found = (await pagesOf(creds, user)).flatMap((page) => pageAccounts(page, user, scopes));
    // An Instagram account granted without a Page it is linked to reads on the login's own token.
    const known = new Set(found.map((account) => account.external_id));
    const lone = grantedIds(user.debug, INSTAGRAM_ASSET_SCOPES).filter((id) => !known.has(id));
    const loneAccounts = await Promise.all(
      lone.map(async (id) =>
        instagramAccount(await graphGet<InstagramAccount>(creds.version, `/${id}`, user.token, { fields: IG_FIELDS }), tokensOf(user.token, user.expires, scopes), '')
      )
    );
    return [...found, ...loneAccounts];
  },

  /**
   * A Facebook Login grant is shared by every Page and Instagram account it
   * handed back, so revoking it for one would cut off the rest: those are only
   * forgotten here. An account from before Unified login is de-authorised as
   * it always was, on the host its token belongs to — best effort.
   */
  async revoke(account, creds) {
    if (isFacebookLogin(account.meta)) return;
    const base = account.provider === 'INSTAGRAM' ? INSTAGRAM_GRAPH : FACEBOOK_GRAPH;
    await graphDelete(creds.version, '/me/permissions', account.access_token, base);
  },
};

/**
 * Settings › Test connection for an app that connects through Facebook Login:
 * the App ID and Secret are proven with an app token, and the answer says
 * which Login configuration Connect will use.
 */
export function probeMetaLogin(label: string): (creds: SocialAppCredentials) => Promise<ProbeOutcome> {
  return async (creds) => {
    const pair = await probeMetaAppPair(creds, label);
    if (!pair.ok) return pair;
    const login = creds.configId
      ? `Connect uses the Login for Business configuration ${creds.configId}.`
      : 'No Login configuration ID is set, so Connect asks for the default permission list. Add the configuration ID from Use cases › Instagram API › API setup with Unified login.';
    return { ok: true, message: `${pair.message}. ${login}` };
  };
}
