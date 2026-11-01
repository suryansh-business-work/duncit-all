import type {
  DiscoveredAccount,
  FetchedComment,
  FetchedPost,
  ProbeOutcome,
  SocialAppCredentials,
  SocialConnector,
  SocialReader,
  SocialTokens,
} from '../social.types';
import { PROBE_CODE, count, expiresAt, postForm, probeClient, socialJson, withQuery } from './http';
import { graphTime } from './meta';

/**
 * Threads, through its own app (never the Facebook one) and the Threads API
 * at graph.threads.net, which is shaped like the Graph API: the token rides in
 * the query, times are stamped `2026-09-20T10:15:00+0000`.
 *
 * The code exchange hands back a short-lived token (an hour); it is swapped at
 * once for a long-lived one (sixty days), which Threads renews on request
 * without a person — so there is no refresh token, only the current access
 * token handed to `refresh_access_token`. Follower and post counts come from
 * the insights endpoints, which need `threads_manage_insights`; when Threads
 * will not say, a count is 0 (views null) rather than the sync failing.
 */
export const THREADS_SERVICE = 'Threads';
const SERVICE = THREADS_SERVICE;
export const THREADS_API = 'https://graph.threads.net';
const API = THREADS_API;
const TOKEN_URL = `${API}/oauth/access_token`;
/** Read the profile, posts and replies; post; read insights. */
const SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_replies',
  'threads_read_replies',
  'threads_manage_insights',
];
const PROFILE_FIELDS = 'id,username,name,threads_profile_picture_url';
/** How Threads words a refused App ID or Secret, as opposed to a refused (fake) code. */
const CLIENT_REFUSED = /client|app id|app secret|platform app/i;

/** Threads judges the app before the code, so a refused code proves the keys. */
export async function probeThreadsApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
  const { accepted, detail } = await probeClient(
    TOKEN_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: creds.redirectUri,
        code: PROBE_CODE,
      }).toString(),
    },
    (status, error) => status === 401 || (status === 400 && CLIENT_REFUSED.test(error))
  );
  return accepted
    ? { ok: true, message: 'Threads accepted the App ID and Secret' }
    : { ok: false, message: `Threads rejected the App ID or Secret (${detail})` };
}

/** The code exchange answers with `user_id`; the exchange and the refresh with `expires_in`. */
interface TokenResponse {
  access_token: string;
  user_id?: number | string;
  token_type?: string;
  expires_in?: number;
}

interface ThreadsUser {
  id: string;
  username?: string;
  name?: string;
  threads_profile_picture_url?: string;
}

/** One metric: a lifetime total, or a series whose first point is the value. */
interface Insight {
  name?: string;
  values?: Array<{ value?: number }>;
  total_value?: { value?: number };
}

interface ThreadsPost {
  id: string;
  text?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

interface ThreadsReply {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  permalink?: string;
}

const threadsUrl = (version: string, path: string) => `${API}/${version}${path}`;

/** Threads GET with the token as a query parameter, which is how the API takes it. */
export function threadsGet<T>(version: string, path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  return socialJson<T>(SERVICE, withQuery(threadsUrl(version, path), { ...params, access_token: token }));
}

/** Threads POST, form-encoded, token in the body. */
export function threadsPost<T>(version: string, path: string, token: string, params: Record<string, string>): Promise<T> {
  return postForm<T>(SERVICE, threadsUrl(version, path), { ...params, access_token: token });
}

const toTokens = (res: TokenResponse): SocialTokens => ({
  access_token: res.access_token,
  refresh_token: '',
  expires_at: expiresAt(res.expires_in),
  scopes: SCOPES,
});

const insightValue = (item: Insight): number => count(item.values?.[0]?.value ?? item.total_value?.value);

/** Each metric by name; empty when the call fails (scope missing, post too new to have insights). */
async function insights(version: string, path: string, token: string, metric: string): Promise<Map<string, number>> {
  try {
    const res = await threadsGet<{ data?: Insight[] }>(version, path, token, { metric });
    return new Map((res.data ?? []).map((item) => [item.name ?? '', insightValue(item)]));
  } catch {
    return new Map();
  }
}

/** 0 when Threads will not say — a connect or a profile sync never fails on the follower count. */
const followers = async (version: string, userId: string, token: string): Promise<number> =>
  (await insights(version, `/${userId}/threads_insights`, token, 'followers_count')).get('followers_count') ?? 0;

type PostMetrics = Pick<FetchedPost, 'likes' | 'comments' | 'shares' | 'views'>;

async function postMetrics(version: string, postId: string, token: string): Promise<PostMetrics> {
  const metrics = await insights(version, `/${postId}/insights`, token, 'views,likes,replies,reposts,quotes');
  const of = (name: string) => metrics.get(name) ?? 0;
  return { likes: of('likes'), comments: of('replies'), shares: of('reposts') + of('quotes'), views: metrics.get('views') ?? null };
}

const me = (version: string, token: string) => threadsGet<ThreadsUser>(version, '/me', token, { fields: PROFILE_FIELDS });

export const threadsConnector: SocialConnector = {
  authorizeUrl: ({ creds, state }) =>
    withQuery('https://threads.net/oauth/authorize', {
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      scope: SCOPES.join(','),
      response_type: 'code',
      state,
    }),

  async connect({ code, creds }): Promise<DiscoveredAccount[]> {
    const short = await postForm<TokenResponse>(SERVICE, TOKEN_URL, {
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: creds.redirectUri,
      code,
    });
    const long = await socialJson<TokenResponse>(
      SERVICE,
      withQuery(`${API}/access_token`, {
        grant_type: 'th_exchange_token',
        client_secret: creds.clientSecret,
        access_token: short.access_token,
      })
    );
    const tokens = toTokens(long);
    const user = await me(creds.version, tokens.access_token);
    const username = user.username ?? '';
    return [
      {
        platform: 'THREADS',
        external_id: user.id,
        name: user.name || username,
        handle: username,
        avatar_url: user.threads_profile_picture_url ?? '',
        profile_url: username ? `https://www.threads.net/@${username}` : '',
        followers: await followers(creds.version, user.id, tokens.access_token),
        tokens,
        meta: {},
      },
    ];
  },
};

export const threadsReader: SocialReader = {
  async refresh(account) {
    const res = await socialJson<TokenResponse>(
      SERVICE,
      withQuery(`${API}/refresh_access_token`, { grant_type: 'th_refresh_token', access_token: account.access_token })
    );
    return toTokens(res);
  },

  async profile(account, creds) {
    const user = await me(creds.version, account.access_token);
    const username = user.username ?? account.handle;
    return {
      name: user.name || username,
      handle: username,
      avatar_url: user.threads_profile_picture_url ?? '',
      followers: await followers(creds.version, account.external_id, account.access_token),
    };
  },

  async posts(account, creds): Promise<FetchedPost[]> {
    const res = await threadsGet<{ data?: ThreadsPost[] }>(creds.version, `/${account.external_id}/threads`, account.access_token, {
      fields: 'id,text,media_type,media_url,thumbnail_url,permalink,timestamp',
      limit: '50',
    });
    const posts: FetchedPost[] = [];
    // One insights call per post, one after another: fifty at once would trip Threads' rate limit.
    for (const post of res.data ?? []) {
      posts.push({
        external_id: post.id,
        text: post.text ?? '',
        // A video's media_url is the file itself; its thumbnail is what a table can show.
        media_url: (post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url) ?? '',
        permalink: post.permalink ?? '',
        published_at: graphTime(post.timestamp),
        ...(await postMetrics(creds.version, post.id, account.access_token)),
      });
    }
    return posts;
  },

  async comments(account, post, creds): Promise<FetchedComment[]> {
    const res = await threadsGet<{ data?: ThreadsReply[] }>(creds.version, `/${post.external_id}/replies`, account.access_token, {
      fields: 'id,text,username,timestamp,permalink',
      limit: '50',
    });
    return (res.data ?? []).map((reply) => ({
      external_id: reply.id,
      author_name: reply.username ?? '',
      author_handle: reply.username ?? '',
      text: reply.text ?? '',
      permalink: reply.permalink ?? post.permalink,
      published_at: graphTime(reply.timestamp),
      likes: 0,
    }));
  },
};
