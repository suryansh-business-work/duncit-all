import type { FetchedComment, FetchedPost, SocialReader } from '../social.types';
import { count } from './http';
import { graphGet, graphTime } from './meta';

/** A Facebook Page, read with its non-expiring Page token. */
const POST_FIELDS =
  'id,message,created_time,permalink_url,full_picture,shares,' +
  'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)';

interface Summary {
  summary?: { total_count?: number };
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
  shares?: { count?: number };
  reactions?: Summary;
  comments?: Summary;
}

interface FacebookComment {
  id: string;
  message?: string;
  created_time?: string;
  like_count?: number;
  permalink_url?: string;
  from?: { id?: string; name?: string };
}

export const facebookReader: SocialReader = {
  async profile(account, creds) {
    const page = await graphGet<{
      name?: string;
      username?: string;
      followers_count?: number;
      fan_count?: number;
      picture?: { data?: { url?: string } };
    }>(creds.version, `/${account.external_id}`, account.access_token, {
      fields: 'name,username,followers_count,fan_count,picture{url}',
    });
    return {
      name: page.name ?? account.external_id,
      handle: page.username ?? '',
      avatar_url: page.picture?.data?.url ?? '',
      followers: count(page.followers_count ?? page.fan_count),
    };
  },

  async posts(account, creds): Promise<FetchedPost[]> {
    const res = await graphGet<{ data?: FacebookPost[] }>(creds.version, `/${account.external_id}/posts`, account.access_token, {
      fields: POST_FIELDS,
      limit: '100',
    });
    return (res.data ?? []).map((post) => ({
      external_id: post.id,
      text: post.message ?? '',
      media_url: post.full_picture ?? '',
      permalink: post.permalink_url ?? `https://www.facebook.com/${post.id}`,
      published_at: graphTime(post.created_time),
      likes: count(post.reactions?.summary?.total_count),
      comments: count(post.comments?.summary?.total_count),
      shares: count(post.shares?.count),
      views: null,
    }));
  },

  async comments(account, post, creds): Promise<FetchedComment[]> {
    const res = await graphGet<{ data?: FacebookComment[] }>(creds.version, `/${post.external_id}/comments`, account.access_token, {
      fields: 'id,message,created_time,like_count,permalink_url,from{id,name}',
      // `stream` flattens replies in with top-level comments, so a reply is
      // judged like any other comment.
      filter: 'stream',
      order: 'reverse_chronological',
      limit: '50',
    });
    return (res.data ?? []).map((comment) => ({
      external_id: comment.id,
      author_name: comment.from?.name ?? '',
      author_handle: comment.from?.id ?? '',
      text: comment.message ?? '',
      permalink: comment.permalink_url ?? post.permalink,
      published_at: graphTime(comment.created_time),
      likes: count(comment.like_count),
    }));
  },
};
