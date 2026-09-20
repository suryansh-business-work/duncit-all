import type { FetchedComment, FetchedPost, SocialReader } from '../social.types';
import { count } from './http';
import { graphGet, graphTime } from './meta';

/**
 * An Instagram Business account, read through the Graph API with the token of
 * the Facebook Page it is linked to — there is no separate Instagram login.
 */
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
  async profile(account, creds) {
    const profile = await graphGet<{
      username?: string;
      name?: string;
      profile_picture_url?: string;
      followers_count?: number;
    }>(creds.version, `/${account.external_id}`, account.access_token, {
      fields: 'username,name,profile_picture_url,followers_count',
    });
    const username = profile.username ?? account.handle;
    return {
      name: profile.name || username,
      handle: username,
      avatar_url: profile.profile_picture_url ?? '',
      followers: count(profile.followers_count),
    };
  },

  async posts(account, creds): Promise<FetchedPost[]> {
    const res = await graphGet<{ data?: InstagramMedia[] }>(creds.version, `/${account.external_id}/media`, account.access_token, {
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: '50',
    });
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
    const res = await graphGet<{ data?: InstagramComment[] }>(creds.version, `/${post.external_id}/comments`, account.access_token, {
      fields: 'id,text,username,timestamp,like_count',
      limit: '50',
    });
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
