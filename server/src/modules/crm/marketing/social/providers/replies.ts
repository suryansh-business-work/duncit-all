import type { SocialPlatform, SocialReplier } from '../social.types';
import { bearer, postJson } from './http';
import { graphBase } from './instagram';
import { LINKEDIN_API, LINKEDIN_SERVICE, linkedinHeaders, orgUrn } from './linkedin';
import { graphPost } from './meta';
import { threadsPost } from './threads';
import { X_API, X_SERVICE } from './x';
import { YOUTUBE_SERVICE } from './youtube';

/**
 * Answering a comment on its own network, with the scopes each connector
 * already asks for. Facebook has no replier: answering a Page comment needs
 * `pages_manage_engagement`, which the Facebook app does not request, so the
 * Inbox says so rather than trying (see social.replies.ts).
 */
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

/** `POST /{comment-id}/replies` on the host the token belongs to — `instagram_business_manage_comments`. */
const instagramReplier: SocialReplier = {
  async reply(account, target, text, creds) {
    const made = await graphPost<{ id: string }>(
      creds.version,
      `/${target.comment_id}/replies`,
      account.access_token,
      { message: text },
      graphBase(account)
    );
    return { external_id: made.id };
  },
};

/** A text container that names the reply it answers, then published — `threads_manage_replies`. */
const threadsReplier: SocialReplier = {
  async reply(account, target, text, creds) {
    const user = `/${account.external_id}`;
    const container = await threadsPost<{ id: string }>(creds.version, `${user}/threads`, account.access_token, {
      media_type: 'TEXT',
      text,
      reply_to_id: target.comment_id,
    });
    const published = await threadsPost<{ id: string }>(creds.version, `${user}/threads_publish`, account.access_token, {
      creation_id: container.id,
    });
    return { external_id: published.id };
  },
};

/** `comments.insert` under the top-level comment — `youtube.force-ssl`. */
const youtubeReplier: SocialReplier = {
  async reply(account, target, text) {
    const { body } = await postJson<{ id?: string }>(
      YOUTUBE_SERVICE,
      `${YOUTUBE_API}/comments?part=snippet`,
      { snippet: { parentId: target.comment_id, textOriginal: text } },
      bearer(account.access_token)
    );
    return { external_id: body.id ?? '' };
  },
};

/** A nested comment as the Page, on the comment it answers — `w_organization_social`. */
const linkedinReplier: SocialReplier = {
  async reply(account, target, text, creds) {
    const { body, headers } = await postJson<{ $URN?: string; id?: string }>(
      LINKEDIN_SERVICE,
      `${LINKEDIN_API}/socialActions/${encodeURIComponent(target.comment_id)}/comments`,
      { actor: orgUrn(account.external_id), object: target.post_id, parentComment: target.comment_id, message: { text } },
      linkedinHeaders(account.access_token, creds.version)
    );
    return { external_id: headers.get('x-restli-id') ?? body.$URN ?? body.id ?? '' };
  },
};

/** A post in reply to the reply — `tweet.write`. */
const xReplier: SocialReplier = {
  async reply(account, target, text) {
    const { body } = await postJson<{ data?: { id?: string } }>(
      X_SERVICE,
      `${X_API}/tweets`,
      { text, reply: { in_reply_to_tweet_id: target.comment_id } },
      bearer(account.access_token)
    );
    return { external_id: body.data?.id ?? '' };
  },
};

/** How each platform is answered; null where this integration has no permission to. */
export const REPLIERS: Record<SocialPlatform, SocialReplier | null> = {
  INSTAGRAM: instagramReplier,
  FACEBOOK: null,
  THREADS: threadsReplier,
  YOUTUBE: youtubeReplier,
  LINKEDIN: linkedinReplier,
  X: xReplier,
};
