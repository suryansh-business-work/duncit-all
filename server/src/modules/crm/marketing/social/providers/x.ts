import type {
  FetchedComment,
  FetchedPost,
  ProbeOutcome,
  SocialAppCredentials,
  SocialConnector,
  SocialReader,
  SocialTokens,
} from '../social.types';
import { PROBE_CODE, bearer, count, expiresAt, postForm, probeClient, socialJson, withQuery } from './http';

/**
 * X, through OAuth 2.0 with PKCE as a confidential client (the secret rides in
 * Basic auth on the token calls).
 *
 * `offline.access` is what makes a refresh token come back at all; the access
 * token lives two hours, and every refresh ROTATES the refresh token, so the
 * new one must be saved each time. Reading replies uses recent search, which
 * X limits to the last seven days and to paid API tiers.
 */
export const X_SERVICE = 'X';
const SERVICE = X_SERVICE;
export const X_API = 'https://api.x.com/2';
const API = X_API;
const TOKEN_URL = `${API}/oauth2/token`;
/** Read the timeline and replies; post, with media. */
const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'];

const basicAuth = (creds: SocialAppCredentials) =>
  `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`;

/** X judges the client (Basic auth) before the code, so a refused code proves the keys. */
export async function probeXApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
  const { accepted, detail } = await probeClient(
    TOKEN_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', Authorization: basicAuth(creds) },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: PROBE_CODE,
        redirect_uri: creds.redirectUri,
        code_verifier: PROBE_CODE.padEnd(43, '0'),
        client_id: creds.clientId,
      }).toString(),
    },
    (status, error) => status === 401 || error === 'unauthorized_client' || error === 'invalid_client'
  );
  return accepted
    ? { ok: true, message: 'X accepted the OAuth 2.0 Client ID and Secret' }
    : { ok: false, message: `X rejected the Client ID or Secret (${detail})` };
}
const USER_FIELDS = 'name,username,profile_image_url,public_metrics';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface XUser {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
  public_metrics?: { followers_count?: number };
}

interface XMetrics {
  like_count?: number;
  reply_count?: number;
  retweet_count?: number;
  quote_count?: number;
  impression_count?: number;
}

interface XTweet {
  id: string;
  text?: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: XMetrics;
  attachments?: { media_keys?: string[] };
}

interface XMedia {
  media_key: string;
  url?: string;
  preview_image_url?: string;
}

function tokenCall(creds: SocialAppCredentials, form: Record<string, string>) {
  return postForm<TokenResponse>(SERVICE, TOKEN_URL, { ...form, client_id: creds.clientId }, { Authorization: basicAuth(creds) });
}

const toTokens = (res: TokenResponse, previousRefresh = ''): SocialTokens => ({
  access_token: res.access_token,
  refresh_token: res.refresh_token ?? previousRefresh,
  expires_at: expiresAt(res.expires_in),
  scopes: (res.scope ?? SCOPES.join(' ')).split(' ').filter(Boolean),
});

const get = <T>(path: string, token: string, params: Record<string, string> = {}) =>
  socialJson<T>(SERVICE, withQuery(`${API}${path}`, params), { headers: bearer(token) });

export const xConnector: SocialConnector = {
  authorizeUrl: ({ creds, state, challenge }) =>
    withQuery('https://x.com/i/oauth2/authorize', {
      response_type: 'code',
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      scope: SCOPES.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }),

  async connect({ code, creds, verifier }) {
    const tokens = toTokens(
      await tokenCall(creds, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: creds.redirectUri,
        code_verifier: verifier,
      })
    );
    const { data: me } = await get<{ data: XUser }>('/users/me', tokens.access_token, { 'user.fields': USER_FIELDS });
    const username = me.username ?? '';
    return [
      {
        platform: 'X',
        external_id: me.id,
        name: me.name ?? username,
        handle: username,
        avatar_url: me.profile_image_url ?? '',
        profile_url: username ? `https://x.com/${username}` : '',
        followers: count(me.public_metrics?.followers_count),
        tokens,
        meta: {},
      },
    ];
  },
};

export const xReader: SocialReader = {
  commentWindowDays: 7,

  async refresh(account, creds) {
    const res = await tokenCall(creds, { grant_type: 'refresh_token', refresh_token: account.refresh_token });
    return toTokens(res, account.refresh_token);
  },

  async profile(account) {
    const { data } = await get<{ data: XUser }>(`/users/${account.external_id}`, account.access_token, {
      'user.fields': USER_FIELDS,
    });
    return {
      name: data.name ?? account.handle,
      handle: data.username ?? account.handle,
      avatar_url: data.profile_image_url ?? '',
      followers: count(data.public_metrics?.followers_count),
    };
  },

  async posts(account): Promise<FetchedPost[]> {
    const res = await get<{ data?: XTweet[]; includes?: { media?: XMedia[] } }>(
      `/users/${account.external_id}/tweets`,
      account.access_token,
      {
        max_results: '100',
        exclude: 'retweets,replies',
        'tweet.fields': 'created_at,public_metrics,attachments',
        expansions: 'attachments.media_keys',
        'media.fields': 'url,preview_image_url',
      }
    );
    const media = new Map((res.includes?.media ?? []).map((item) => [item.media_key, item]));
    return (res.data ?? []).map((tweet) => {
      const metrics = tweet.public_metrics ?? {};
      const first = media.get(tweet.attachments?.media_keys?.[0] ?? '');
      return {
        external_id: tweet.id,
        text: tweet.text ?? '',
        media_url: first?.url ?? first?.preview_image_url ?? '',
        permalink: `https://x.com/${account.handle || 'i'}/status/${tweet.id}`,
        published_at: new Date(tweet.created_at ?? Date.now()),
        likes: count(metrics.like_count),
        comments: count(metrics.reply_count),
        shares: count(metrics.retweet_count) + count(metrics.quote_count),
        views: metrics.impression_count ?? null,
      };
    });
  },

  async comments(account, post): Promise<FetchedComment[]> {
    const res = await get<{ data?: XTweet[]; includes?: { users?: XUser[] } }>(
      '/tweets/search/recent',
      account.access_token,
      {
        query: `conversation_id:${post.external_id} is:reply`,
        max_results: '50',
        'tweet.fields': 'author_id,created_at,public_metrics',
        expansions: 'author_id',
        'user.fields': 'name,username',
      }
    );
    const users = new Map((res.includes?.users ?? []).map((user) => [user.id, user]));
    return (res.data ?? []).map((reply) => {
      const author = users.get(reply.author_id ?? '');
      const username = author?.username ?? '';
      return {
        external_id: reply.id,
        author_name: author?.name ?? username,
        author_handle: username,
        text: reply.text ?? '',
        permalink: `https://x.com/${username || 'i'}/status/${reply.id}`,
        published_at: new Date(reply.created_at ?? Date.now()),
        likes: count(reply.public_metrics?.like_count),
      };
    });
  },
};
