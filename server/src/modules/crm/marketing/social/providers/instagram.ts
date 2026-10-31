import type { FetchedComment, FetchedPost, SocialAccountHandle, SocialReader } from '../social.types';
import { SocialApiError, count } from './http';
import { refreshInstagramToken } from './instagram.auth';
import { FACEBOOK_GRAPH, INSTAGRAM_GRAPH, INSTAGRAM_SERVICE, graphGet, graphTime } from './meta';

export { INSTAGRAM_SERVICE } from './meta';
export { INSTAGRAM_SCOPES, instagramConnector, probeInstagramApp, refreshInstagramToken } from './instagram.auth';

/**
 * An Instagram professional account. Which Graph host answers for it depends
 * on the app it was connected through: Instagram Login hands out a token only
 * graph.instagram.com honours, while an account connected through Facebook
 * before Instagram had its own app holds a Page token, which only
 * graph.facebook.com does — that account keeps provider FACEBOOK and reads
 * exactly as it always did.
 */
export const graphBase = (account: SocialAccountHandle): string =>
  account.provider === 'FACEBOOK' ? FACEBOOK_GRAPH : INSTAGRAM_GRAPH;

const PROFILE_FIELDS = 'username,name,profile_picture_url,followers_count';

interface InstagramProfile {
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

interface InstagramComment {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
}

export const instagramReader: SocialReader = {
  /** Only a token from Instagram Login renews; a Page token never expires, so one that has needs a person. */
  async refresh(account) {
    if (account.provider === 'FACEBOOK') {
      throw new SocialApiError(INSTAGRAM_SERVICE, 401, 'the Page token has expired — reconnect this account', true);
    }
    return refreshInstagramToken(account.access_token);
  },

  async profile(account, creds) {
    const base = graphBase(account);
    // Instagram Login reads the signed-in account as `me`; a Page token names it by id.
    const path = base === INSTAGRAM_GRAPH ? '/me' : `/${account.external_id}`;
    const profile = await graphGet<InstagramProfile>(creds.version, path, account.access_token, { fields: PROFILE_FIELDS }, base);
    const username = profile.username ?? account.handle;
    return {
      name: profile.name || username,
      handle: username,
      avatar_url: profile.profile_picture_url ?? '',
      followers: count(profile.followers_count),
    };
  },

  async posts(account, creds): Promise<FetchedPost[]> {
    const res = await graphGet<{ data?: InstagramMedia[] }>(
      creds.version,
      `/${account.external_id}/media`,
      account.access_token,
      {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: '50',
      },
      graphBase(account)
    );
    return (res.data ?? []).map((media) => ({
      external_id: media.id,
      text: media.caption ?? '',
      // A video's media_url is the file itself; its thumbnail is what a table can show.
      media_url: (media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url) ?? '',
      permalink: media.permalink ?? '',
      published_at: graphTime(media.timestamp),
      likes: count(media.like_count),
      comments: count(media.comments_count),
      shares: 0,
      views: null,
    }));
  },

  async comments(account, post, creds): Promise<FetchedComment[]> {
    const res = await graphGet<{ data?: InstagramComment[] }>(
      creds.version,
      `/${post.external_id}/comments`,
      account.access_token,
      { fields: 'id,text,username,timestamp,like_count', limit: '50' },
      graphBase(account)
    );
    return (res.data ?? []).map((comment) => ({
      external_id: comment.id,
      author_name: comment.username ?? '',
      author_handle: comment.username ?? '',
      text: comment.text ?? '',
      permalink: post.permalink,
      published_at: graphTime(comment.timestamp),
      likes: count(comment.like_count),
    }));
  },
};
