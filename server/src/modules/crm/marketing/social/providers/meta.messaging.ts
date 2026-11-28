import type { SocialAccountHandle, SocialAppCredentials } from '../social.types';
import { SocialApiError, socialJson } from './http';
import { FACEBOOK_SERVICE, graphGet, graphPost, graphTime, isFacebookLogin } from './meta';

/**
 * Direct messages on Meta, through the Page: Instagram messaging with
 * Facebook Login and Messenger both answer at `/{page-id}/messages` with the
 * Page token, so an Instagram account can message only when it is linked to
 * a Page (`meta.page_id`, stored at connect — meta.login.ts).
 */

/**
 * The fields a Page is subscribed to, so its DMs and comments reach the
 * webhook. Only Page field names belong here: Meta refuses the whole call over
 * one it does not know (`messaging_seen` is an Instagram webhook field; the
 * Page's read receipts are `message_reads`, which nothing here reads).
 */
export const PAGE_WEBHOOK_FIELDS = ['messages', 'messaging_postbacks', 'message_reactions', 'feed'];

/** The Page whose `/messages` an account sends from, or null when it has none. */
export function messagingPageOf(account: Pick<SocialAccountHandle, 'platform' | 'external_id' | 'meta' | 'provider'>): string | null {
  if (account.platform === 'FACEBOOK') return account.external_id;
  if (account.platform === 'INSTAGRAM' && isFacebookLogin(account.meta)) return account.meta.page_id || null;
  return null;
}

/** Who a message goes to: a person by their scoped id, or a commenter by the comment (a private reply). */
export type MessageRecipient = { id: string } | { comment_id: string };

export interface OutgoingMessage {
  text: string;
  messaging_type: 'RESPONSE' | 'MESSAGE_TAG';
  tag: '' | 'HUMAN_AGENT';
}

export async function sendPageMessage(
  account: SocialAccountHandle,
  recipient: MessageRecipient,
  message: OutgoingMessage,
  creds: SocialAppCredentials
): Promise<{ external_id: string; recipient_id: string }> {
  const page = messagingPageOf(account);
  if (!page) throw new SocialApiError(FACEBOOK_SERVICE, 400, 'this account is not linked to a Facebook Page, which messaging needs', false);
  const sent = await graphPost<{ message_id?: string; recipient_id?: string }>(creds.version, `/${page}/messages`, account.access_token, {
    recipient: JSON.stringify(recipient),
    message: JSON.stringify({ text: message.text }),
    messaging_type: message.messaging_type,
    ...(message.tag ? { tag: message.tag } : {}),
  });
  return { external_id: sent.message_id ?? '', recipient_id: sent.recipient_id ?? '' };
}

export interface ParticipantProfile {
  username: string;
  name: string;
  avatar_url: string;
}

/** The person's name and picture — Business Asset User Profile Access on Instagram; best effort. */
export async function participantProfile(account: SocialAccountHandle, id: string, creds: SocialAppCredentials): Promise<ParticipantProfile> {
  if (account.platform === 'INSTAGRAM') {
    const p = await graphGet<{ name?: string; username?: string; profile_pic?: string }>(creds.version, `/${id}`, account.access_token, {
      fields: 'name,username,profile_pic',
    });
    return { username: p.username ?? '', name: p.name ?? p.username ?? '', avatar_url: p.profile_pic ?? '' };
  }
  const p = await graphGet<{ first_name?: string; last_name?: string; profile_pic?: string }>(creds.version, `/${id}`, account.access_token, {
    fields: 'first_name,last_name,profile_pic',
  });
  return { username: '', name: [p.first_name, p.last_name].filter(Boolean).join(' '), avatar_url: p.profile_pic ?? '' };
}

interface GraphPerson {
  id: string;
  username?: string;
  name?: string;
}

interface GraphMessage {
  id: string;
  message?: string;
  created_time?: string;
  from?: GraphPerson;
  attachments?: { data?: { image_data?: { url?: string }; video_data?: { url?: string }; file_url?: string; mime_type?: string }[] };
  /** A post, reel or link the person shared. */
  shares?: { data?: { link?: string }[] };
  /** Instagram: a reply to, or a mention in, a story. */
  story?: { reply_to?: { link?: string }; mention?: { link?: string } };
  /** Messenger: the sticker's image. */
  sticker?: string;
}

interface GraphConversation {
  id: string;
  updated_time?: string;
  participants?: { data?: GraphPerson[] };
  messages?: { data?: GraphMessage[] };
}

interface ConversationPage {
  data?: GraphConversation[];
  paging?: { next?: string };
}

export interface FetchedMessage {
  external_id: string;
  from_id: string;
  text: string;
  attachments: { type: string; url: string }[];
  sent_at: Date;
}

export interface FetchedConversation {
  external_thread_id: string;
  participant: GraphPerson;
  messages: FetchedMessage[];
}

/** Files, then shares, story replies and stickers: a message with no text still says what it was. */
export const attachmentsOf = (message: GraphMessage) =>
  [
    ...(message.attachments?.data ?? []).map((item) => {
      if (item.image_data?.url) return { type: 'image', url: item.image_data.url };
      if (item.video_data?.url) return { type: 'video', url: item.video_data.url };
      return { type: item.mime_type ?? 'file', url: item.file_url ?? '' };
    }),
    ...(message.shares?.data ?? []).map((share) => ({ type: 'share', url: share.link ?? '' })),
    { type: 'story_reply', url: message.story?.reply_to?.link ?? '' },
    { type: 'story_mention', url: message.story?.mention?.link ?? '' },
    { type: 'sticker', url: message.sticker ?? '' },
  ].filter((item) => item.url);

/** The message fields each platform has: Meta refuses a whole read over one it does not know. */
const MESSAGE_FIELDS = {
  instagram: 'id,message,from,created_time,attachments,shares,story',
  messenger: 'id,message,from,created_time,attachments,shares,sticker',
} as const;
/** A backfill reads at most this many pages of 50 conversations. */
const MAX_CONVERSATION_PAGES = 5;

const updatedAt = (conversation: GraphConversation) => graphTime(conversation.updated_time).getTime();

/** Pages of conversations, newest first, until one reaches back past `since` (or the cap). */
async function conversationsSince(account: SocialAccountHandle, page: string, since: Date, creds: SocialAppCredentials): Promise<GraphConversation[]> {
  const platform = account.platform === 'INSTAGRAM' ? 'instagram' : 'messenger';
  let res = await graphGet<ConversationPage>(creds.version, `/${page}/conversations`, account.access_token, {
    platform,
    fields: `participants,updated_time,messages.limit(25){${MESSAGE_FIELDS[platform]}}`,
    limit: '50',
  });
  const all = [...(res.data ?? [])];
  for (let pages = 1; pages < MAX_CONVERSATION_PAGES && res.paging?.next; pages += 1) {
    const oldest = all.at(-1);
    if (!oldest || updatedAt(oldest) < since.getTime()) break;
    res = await socialJson<ConversationPage>(FACEBOOK_SERVICE, res.paging.next);
    all.push(...(res.data ?? []));
  }
  return all;
}

/**
 * The Page's conversations updated since `since`, each with its latest
 * messages — the backfill on connect and the fallback when a webhook was missed.
 */
export async function recentConversations(account: SocialAccountHandle, since: Date, creds: SocialAppCredentials): Promise<FetchedConversation[]> {
  const page = messagingPageOf(account);
  if (!page) return [];
  const conversations = await conversationsSince(account, page, since, creds);
  const own = new Set([account.external_id, page]);
  return conversations
    .filter((conversation) => updatedAt(conversation) >= since.getTime())
    .flatMap((conversation) => {
      const participant = (conversation.participants?.data ?? []).find((person) => !own.has(person.id));
      if (!participant) return [];
      const messages = (conversation.messages?.data ?? []).map((message) => ({
        external_id: message.id,
        from_id: message.from?.id ?? '',
        text: message.message ?? '',
        attachments: attachmentsOf(message),
        sent_at: graphTime(message.created_time),
      }));
      return [{ external_thread_id: conversation.id, participant, messages }];
    });
}

/** Subscribe the Page to this app's webhook — needs `pages_manage_metadata`. */
export async function subscribePageWebhooks(pageId: string, pageToken: string, creds: SocialAppCredentials): Promise<void> {
  await graphPost(creds.version, `/${pageId}/subscribed_apps`, pageToken, { subscribed_fields: PAGE_WEBHOOK_FIELDS.join(',') });
}
