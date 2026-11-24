import type { SocialTokens } from '../social.types';
import { expiresAt, socialJson, withQuery } from './http';
import { INSTAGRAM_GRAPH, INSTAGRAM_SERVICE } from './meta';

/**
 * Accounts connected through the retired "Instagram API with Instagram Login"
 * (before Meta moved newer apps to Unified login, see meta.login.ts) hold a
 * long-lived token only graph.instagram.com honours. New connects never come
 * this way; these accounts keep reading, and their token keeps renewing, until
 * someone reconnects them.
 */

/** The permissions those accounts were granted. */
export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
  'instagram_business_manage_insights',
];

interface LongLivedToken {
  access_token: string;
  expires_in?: number;
}

/**
 * Sixty more days on a long-lived token. Instagram renews only a token that is
 * at least a day old and not yet expired — an expired one needs a reconnect.
 */
export async function refreshInstagramToken(accessToken: string): Promise<SocialTokens> {
  const res = await socialJson<LongLivedToken>(
    INSTAGRAM_SERVICE,
    withQuery(`${INSTAGRAM_GRAPH}/refresh_access_token`, { grant_type: 'ig_refresh_token', access_token: accessToken })
  );
  return { access_token: res.access_token, refresh_token: '', expires_at: expiresAt(res.expires_in), scopes: INSTAGRAM_SCOPES };
}
