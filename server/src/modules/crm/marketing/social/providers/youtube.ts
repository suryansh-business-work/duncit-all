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
import {
  PROBE_CODE,
  SocialApiError,
  bearer,
  count,
  expiresAt,
  postForm,
  probeClient,
  socialJson,
  withQuery,
} from './http';

/**
 * A YouTube channel, through Google OAuth and the YouTube Data API v3.
 *
 * `youtube.force-ssl` is the scope Google lists for reading comment threads
 * with a user token; `youtube.readonly` covers the channel and video reads.
 * `access_type=offline` + `prompt=consent` are what guarantee a refresh token,
 * so the channel keeps syncing after the one-hour access token lapses.
 */
export const YOUTUBE_SERVICE = 'YouTube';
const SERVICE = YOUTUBE_SERVICE;
const API = 'https://www.googleapis.com/youtube/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Google judges the client before the code: `invalid_client` means the keys, `invalid_grant` means the (fake) code. */
export async function probeYouTubeApp(creds: SocialAppCredentials): Promise<ProbeOutcome> {
  const { accepted, detail } = await probeClient(
    TOKEN_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: PROBE_CODE,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: creds.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    },
    (status, error) => status === 401 || error === 'invalid_client' || error === 'unauthorized_client'
  );
  return accepted
    ? { ok: true, message: 'Google accepted the YouTube OAuth Client ID and Secret' }
    : { ok: false, message: `Google rejected the Client ID or Secret (${detail})` };
}
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface Channel {
  id: string;
  snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } };
  statistics?: { subscriberCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface Video {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}

interface CommentThread {
  snippet?: {
    topLevelComment?: {
      id: string;
      snippet?: {
        authorDisplayName?: string;
        authorChannelUrl?: string;
        textOriginal?: string;
        publishedAt?: string;
        likeCount?: number;
      };
    };
  };
}

const get = <T>(path: string, token: string, params: Record<string, string>) =>
  socialJson<T>(SERVICE, withQuery(`${API}${path}`, params), { headers: bearer(token) });

const toTokens = (res: TokenResponse, previousRefresh = ''): SocialTokens => ({
  access_token: res.access_token,
  // Google sends a refresh token only on the consent exchange, never on a refresh.
  refresh_token: res.refresh_token ?? previousRefresh,
  expires_at: expiresAt(res.expires_in),
  scopes: (res.scope ?? SCOPES.join(' ')).split(' ').filter(Boolean),
});

function channelAccount(channel: Channel, tokens: SocialTokens): DiscoveredAccount {
  const handle = channel.snippet?.customUrl ?? '';
  return {
    platform: 'YOUTUBE',
    external_id: channel.id,
    name: channel.snippet?.title ?? handle,
    handle,
    avatar_url: channel.snippet?.thumbnails?.default?.url ?? '',
    profile_url: `https://www.youtube.com/channel/${channel.id}`,
    followers: count(channel.statistics?.subscriberCount),
    tokens,
    meta: { uploads: channel.contentDetails?.relatedPlaylists?.uploads ?? '' },
  };
}

export const youtubeConnector: SocialConnector = {
  authorizeUrl: ({ creds, state }) =>
    withQuery('https://accounts.google.com/o/oauth2/v2/auth', {
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    }),

  async connect({ code, creds }) {
    const tokens = toTokens(
      await postForm<TokenResponse>(SERVICE, TOKEN_URL, {
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: creds.redirectUri,
        grant_type: 'authorization_code',
      })
    );
    const res = await get<{ items?: Channel[] }>('/channels', tokens.access_token, {
      part: 'snippet,statistics,contentDetails',
      mine: 'true',
    });
    return (res.items ?? []).map((channel) => channelAccount(channel, tokens));
  },
};

/** A video with comments turned off answers 403 `commentsDisabled` — that is "no comments". */
const commentsDisabled = (error: unknown) =>
  error instanceof SocialApiError && error.status === 403 && /disabled comments/i.test(error.message);

export const youtubeReader: SocialReader = {
  async refresh(account, creds: SocialAppCredentials) {
    const res = await postForm<TokenResponse>(SERVICE, TOKEN_URL, {
      refresh_token: account.refresh_token,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'refresh_token',
    });
    return toTokens(res, account.refresh_token);
  },

  async profile(account) {
    const res = await get<{ items?: Channel[] }>('/channels', account.access_token, {
      part: 'snippet,statistics',
      id: account.external_id,
    });
    const channel = res.items?.[0];
    return {
      name: channel?.snippet?.title ?? account.handle,
      handle: channel?.snippet?.customUrl ?? account.handle,
      avatar_url: channel?.snippet?.thumbnails?.default?.url ?? '',
      followers: count(channel?.statistics?.subscriberCount),
    };
  },

  async posts(account): Promise<FetchedPost[]> {
    const uploads = account.meta.uploads;
    if (!uploads) return [];
    const list = await get<{ items?: Array<{ contentDetails?: { videoId?: string } }> }>(
      '/playlistItems',
      account.access_token,
      { part: 'contentDetails', playlistId: uploads, maxResults: '50' }
    );
    const ids = (list.items ?? []).map((item) => item.contentDetails?.videoId ?? '').filter(Boolean);
    if (ids.length === 0) return [];
    const videos = await get<{ items?: Video[] }>('/videos', account.access_token, {
      part: 'snippet,statistics',
      id: ids.join(','),
    });
    return (videos.items ?? []).map((video) => ({
      external_id: video.id,
      text: video.snippet?.title ?? '',
      media_url: video.snippet?.thumbnails?.medium?.url ?? '',
      permalink: `https://www.youtube.com/watch?v=${video.id}`,
      published_at: new Date(video.snippet?.publishedAt ?? Date.now()),
      likes: count(video.statistics?.likeCount),
      comments: count(video.statistics?.commentCount),
      shares: 0,
      views: count(video.statistics?.viewCount),
    }));
  },

  async comments(account, post): Promise<FetchedComment[]> {
    try {
      const res = await get<{ items?: CommentThread[] }>('/commentThreads', account.access_token, {
        part: 'snippet',
        videoId: post.external_id,
        maxResults: '50',
        order: 'time',
        textFormat: 'plainText',
      });
      return (res.items ?? []).flatMap((thread) => {
        const top = thread.snippet?.topLevelComment;
        if (!top) return [];
        const snippet = top.snippet ?? {};
        return [
          {
            external_id: top.id,
            author_name: snippet.authorDisplayName ?? '',
            author_handle: snippet.authorChannelUrl ?? '',
            text: snippet.textOriginal ?? '',
            permalink: `${post.permalink}&lc=${top.id}`,
            published_at: new Date(snippet.publishedAt ?? Date.now()),
            likes: count(snippet.likeCount),
          },
        ];
      });
    } catch (error) {
      if (commentsDisabled(error)) return [];
      throw error;
    }
  },
};
