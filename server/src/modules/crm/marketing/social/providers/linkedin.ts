import type {
  DiscoveredAccount,
  FetchedComment,
  FetchedPost,
  ProbeOutcome,
  SocialAccountHandle,
  SocialAppCredentials,
  SocialConnector,
  SocialReader,
  SocialTokens,
} from '../social.types';
import { PROBE_CODE, bearer, count, expiresAt, postForm, probeClient, socialJson, withQuery } from './http';

/**
 * LinkedIn company Pages, through the Community Management API.
 *
 * A member's own feed is closed to third-party apps, so connecting LinkedIn
 * means connecting the Pages the signing-in member ADMINISTERS. The app needs
 * the Community Management API product approved for these scopes; without it
 * LinkedIn refuses at the consent screen with `unauthorized_scope_error`.
 */
export const LINKEDIN_SERVICE = 'LinkedIn';
const SERVICE = LINKEDIN_SERVICE;
const AUTH = 'https://www.linkedin.com/oauth/v2';
export const LINKEDIN_API = 'https://api.linkedin.com/rest';
const API = LINKEDIN_API;
/** Read the Page, its posts and comments, and post as the Page. */
const SCOPES = ['r_organization_social', 'w_organization_social', 'r_organization_admin'];
/** The share-statistics call takes every post's URN in its query string; 50 keeps it short. */
const POST_LIMIT = 50;
const COMMENT_LIMIT = 50;

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export const linkedinHeaders = (token: string, version: string) => ({
  ...bearer(token),
  'LinkedIn-Version': version,
  'X-Restli-Protocol-Version': '2.0.0',
});
const headers = linkedinHeaders;

const get = <T>(path: string, token: string, version: string) =>
  socialJson<T>(SERVICE, `${API}${path}`, { headers: headers(token, version) });

export const orgUrn = (id: string) => `urn:li:organization:${id}`;

/** LinkedIn judges the client before the code, so a refused code proves the keys. */
export async function probeLinkedInApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
  const { accepted, detail } = await probeClient(
    `${AUTH}/accessToken`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: PROBE_CODE,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: creds.redirectUri,
      }).toString(),
    },
    (status, error) => status === 401 || error === 'invalid_client'
  );
  return accepted
    ? { ok: true, message: 'LinkedIn accepted the Client ID and Secret' }
    : { ok: false, message: `LinkedIn rejected the Client ID or Secret (${detail})` };
}
const enc = encodeURIComponent;

const toTokens = (res: TokenResponse, previousRefresh = ''): SocialTokens => ({
  access_token: res.access_token,
  refresh_token: res.refresh_token ?? previousRefresh,
  expires_at: expiresAt(res.expires_in),
  scopes: (res.scope ?? SCOPES.join(',')).split(/[ ,]/).filter(Boolean),
});

async function followerCount(orgId: string, token: string, version: string): Promise<number> {
  const res = await get<{ firstDegreeSize?: number }>(
    `/networkSizes/${enc(orgUrn(orgId))}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
    token,
    version
  );
  return count(res.firstDegreeSize);
}

interface Organization {
  id: number;
  localizedName?: string;
  vanityName?: string;
}

async function discoverPage(orgId: string, tokens: SocialTokens, version: string): Promise<DiscoveredAccount> {
  const [org, followers] = await Promise.all([
    get<Organization>(`/organizations/${orgId}`, tokens.access_token, version),
    followerCount(orgId, tokens.access_token, version),
  ]);
  const vanity = org.vanityName ?? '';
  return {
    platform: 'LINKEDIN',
    external_id: orgId,
    name: org.localizedName ?? vanity,
    handle: vanity,
    avatar_url: '',
    profile_url: vanity ? `https://www.linkedin.com/company/${vanity}` : `https://www.linkedin.com/company/${orgId}`,
    followers,
    tokens,
    meta: {},
  };
}

export const linkedinConnector: SocialConnector = {
  authorizeUrl: ({ creds, state }) =>
    withQuery(`${AUTH}/authorization`, {
      response_type: 'code',
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      state,
      scope: SCOPES.join(' '),
    }),

  async connect({ code, creds }) {
    const token = await postForm<TokenResponse>(SERVICE, `${AUTH}/accessToken`, {
      grant_type: 'authorization_code',
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
    });
    const tokens = toTokens(token);
    const acl = await get<{ elements?: Array<{ organization?: string }> }>(
      '/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50',
      tokens.access_token,
      creds.version
    );
    const orgIds = (acl.elements ?? [])
      .map((element) => element.organization?.split(':').pop() ?? '')
      .filter(Boolean);
    return Promise.all(orgIds.map((orgId) => discoverPage(orgId, tokens, creds.version)));
  },
};

interface LinkedInPost {
  id: string;
  commentary?: string;
  publishedAt?: number;
  createdAt?: number;
}

interface ShareStatistics {
  share?: string;
  ugcPost?: string;
  totalShareStatistics?: { likeCount?: number; commentCount?: number; shareCount?: number; impressionCount?: number };
}

/** One call for every post's numbers, split by the two URN kinds LinkedIn keeps. */
async function shareStatistics(account: SocialAccountHandle, ids: string[], version: string) {
  const list = (prefix: string) =>
    ids
      .filter((id) => id.startsWith(prefix))
      .map(enc)
      .join(',');
  const shares = list('urn:li:share:');
  const ugcPosts = list('urn:li:ugcPost:');
  let path = `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${enc(orgUrn(account.external_id))}`;
  if (shares) path += `&shares=List(${shares})`;
  if (ugcPosts) path += `&ugcPosts=List(${ugcPosts})`;
  const res = await get<{ elements?: ShareStatistics[] }>(path, account.access_token, version);
  return new Map((res.elements ?? []).map((element) => [element.share ?? element.ugcPost ?? '', element.totalShareStatistics ?? {}]));
}

interface LinkedInComment {
  id?: string;
  $URN?: string;
  actor?: string;
  message?: { text?: string };
  created?: { time?: number };
  likesSummary?: { totalLikes?: number };
}

export const linkedinReader: SocialReader = {
  async refresh(account, creds: SocialAppCredentials) {
    const token = await postForm<TokenResponse>(SERVICE, `${AUTH}/accessToken`, {
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    });
    return toTokens(token, account.refresh_token);
  },

  async profile(account, creds) {
    const tokens: SocialTokens = { access_token: account.access_token, refresh_token: '', expires_at: null, scopes: [] };
    const page = await discoverPage(account.external_id, tokens, creds.version);
    return { name: page.name, handle: page.handle, avatar_url: page.avatar_url, followers: page.followers };
  },

  async posts(account, creds): Promise<FetchedPost[]> {
    const res = await get<{ elements?: LinkedInPost[] }>(
      `/posts?author=${enc(orgUrn(account.external_id))}&q=author&count=${POST_LIMIT}&sortBy=LAST_MODIFIED`,
      account.access_token,
      creds.version
    );
    const posts = res.elements ?? [];
    if (posts.length === 0) return [];
    const stats = await shareStatistics(account, posts.map((post) => post.id), creds.version);
    return posts.map((post) => {
      const numbers = stats.get(post.id) ?? {};
      return {
        external_id: post.id,
        text: post.commentary ?? '',
        media_url: '',
        permalink: `https://www.linkedin.com/feed/update/${post.id}`,
        published_at: new Date(post.publishedAt ?? post.createdAt ?? Date.now()),
        likes: count(numbers.likeCount),
        comments: count(numbers.commentCount),
        shares: count(numbers.shareCount),
        views: numbers.impressionCount ?? null,
      };
    });
  },

  async comments(account, post, creds): Promise<FetchedComment[]> {
    const res = await get<{ elements?: LinkedInComment[] }>(
      `/socialActions/${enc(post.external_id)}/comments?count=${COMMENT_LIMIT}`,
      account.access_token,
      creds.version
    );
    return (res.elements ?? []).map((comment) => ({
      external_id: comment.$URN ?? comment.id ?? '',
      // Member names are closed to Page apps; the actor URN is all LinkedIn gives.
      author_name: '',
      author_handle: comment.actor ?? '',
      text: comment.message?.text ?? '',
      permalink: post.permalink,
      published_at: new Date(comment.created?.time ?? Date.now()),
      likes: count(comment.likesSummary?.totalLikes),
    }));
  },
};
