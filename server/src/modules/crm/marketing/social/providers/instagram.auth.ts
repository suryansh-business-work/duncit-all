import type { ProbeOutcome, SocialAppCredentials, SocialConnector, SocialTokens } from '../social.types';
import { PROBE_CODE, SocialApiError, count, expiresAt, postForm, probeClient, socialJson, withQuery } from './http';
import { INSTAGRAM_GRAPH, INSTAGRAM_SERVICE, graphDelete, graphGet } from './meta';

/**
 * The Instagram app, through "Instagram API with Instagram Login": the person
 * signs in to Instagram itself, with no Facebook Page in between. The code
 * buys a short-lived token, which is swapped for a long-lived one (about
 * sixty days) that {@link refreshInstagramToken} renews before it lapses.
 */
const SERVICE = INSTAGRAM_SERVICE;
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';

/** Read the profile, media, comments and insights; publish media. */
export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
  'instagram_business_manage_insights',
];

const ME_FIELDS = 'user_id,username,name,profile_picture_url,followers_count';

interface IssuedToken {
  access_token?: string;
  /** A bare number in Instagram's JSON — past 2^53, so Graph's string is preferred where there is one. */
  user_id?: string | number;
}

/** Business Login wraps the issued token in `data`; the older shape is flat. */
interface TokenResponse extends IssuedToken {
  data?: IssuedToken[] | null;
}

interface LongLivedToken {
  access_token: string;
  expires_in?: number;
}

interface InstagramUser {
  user_id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

/** What Instagram's token endpoint says when it is the app, not the code, it refuses. */
const CLIENT_REFUSED = /client|platform app|app id|app secret/i;

/**
 * Instagram's token endpoint answers `{error_type, code, error_message}` and
 * says 400 for a bad client and a bad code alike, so the sentence is what
 * tells them apart: a 401 or words about the client mean the keys were
 * refused; words about the code ("Invalid authorization code") mean they
 * were accepted and only the code was not.
 */
export async function probeInstagramApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
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
    (status, error) => status === 401 || CLIENT_REFUSED.test(error)
  );
  return accepted
    ? { ok: true, message: 'Instagram accepted the App ID and Secret' }
    : { ok: false, message: `Instagram rejected the App ID or Secret (${detail})` };
}

/** The issued token, whichever shape it came in. */
const issuedToken = (res: TokenResponse) => {
  const token = res.data?.[0] ?? res;
  const { access_token } = token;
  if (!access_token) throw new SocialApiError(SERVICE, 502, 'no token came back from the code exchange', false);
  return { access_token, user_id: token.user_id };
};

/** A long-lived token as stored: it renews from itself, so there is no refresh token. */
const longLivedTokens = (res: LongLivedToken): SocialTokens => ({
  access_token: res.access_token,
  refresh_token: '',
  expires_at: expiresAt(res.expires_in),
  scopes: INSTAGRAM_SCOPES,
});

/**
 * Sixty more days on a long-lived token. Instagram renews only a token that is
 * at least a day old and not yet expired — an expired one needs a reconnect.
 */
export async function refreshInstagramToken(accessToken: string): Promise<SocialTokens> {
  const res = await socialJson<LongLivedToken>(
    SERVICE,
    withQuery(`${INSTAGRAM_GRAPH}/refresh_access_token`, { grant_type: 'ig_refresh_token', access_token: accessToken })
  );
  return longLivedTokens(res);
}

export const instagramConnector: SocialConnector = {
  authorizeUrl: ({ creds, state }) =>
    withQuery('https://www.instagram.com/oauth/authorize', {
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      scope: INSTAGRAM_SCOPES.join(','),
      response_type: 'code',
      state,
      // A second Connect must ask again rather than silently reuse the last session.
      force_reauth: 'true',
    }),

  async connect({ code, creds }) {
    const short = issuedToken(
      await postForm<TokenResponse>(SERVICE, TOKEN_URL, {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: creds.redirectUri,
        code,
      })
    );
    const long = await socialJson<LongLivedToken>(
      SERVICE,
      withQuery(`${INSTAGRAM_GRAPH}/access_token`, {
        grant_type: 'ig_exchange_token',
        client_secret: creds.clientSecret,
        access_token: short.access_token,
      })
    );
    const me = await graphGet<InstagramUser>(creds.version, '/me', long.access_token, { fields: ME_FIELDS }, INSTAGRAM_GRAPH);
    const username = me.username ?? '';
    return [
      {
        platform: 'INSTAGRAM',
        external_id: me.user_id ?? String(short.user_id),
        name: me.name || username,
        handle: username,
        avatar_url: me.profile_picture_url ?? '',
        profile_url: username ? `https://www.instagram.com/${username}` : '',
        followers: count(me.followers_count),
        tokens: longLivedTokens(long),
        meta: {},
      },
    ];
  },

  /** De-authorise the app for the signed-in Instagram account; best effort, as Meta documents it loosely for Instagram Login. */
  async revoke(account, creds) {
    await graphDelete(creds.version, '/me/permissions', account.access_token, INSTAGRAM_GRAPH);
  },
};
