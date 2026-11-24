import type { SocialAccountHandle, SocialAppCredentials } from '../social.types';
import { SocialApiError } from './http';
import { FACEBOOK_SERVICE, graphGet, graphPost, graphTime, isFacebookLogin } from './meta';

/**
 * Direct messages on Meta, through the Page: Instagram messaging with
 * Facebook Login and Messenger both answer at `/{page-id}/messages` with the
 * Page token, so an Instagram account can message only when it is linked to
 * a Page (`meta.page_id`, stored at connect — meta.login.ts).
 */

/** The fields a Page is subscribed to, so its DMs and comments reach the webhook. */
export const PAGE_WEBHOOK_FIELDS = ['messages', 'messaging_postbacks', 'message_reactions', 'messaging_seen', 'feed'];

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
}

interface GraphConversation {
  id: string;
  updated_time?: string;
  participants?: { data?: GraphPerson[] };
  messages?: { data?: GraphMessage[] };
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

const attachmentsOf = (message: GraphMessage) =>
  (message.attachments?.data ?? [])
    .map((item) => {
      if (item.image_data?.url) return { type: 'image', url: item.image_data.url };
      if (item.video_data?.url) return { type: 'video', url: item.video_data.url };
      return { type: item.mime_type ?? 'file', url: item.file_url ?? '' };
    })
    .filter((item) => item.url);

/**
 * The Page's conversations updated since `since`, each with its latest
 * messages — the backfill on connect and the fallback when a webhook was missed.
 */
export async function recentConversations(account: SocialAccountHandle, since: Date, creds: SocialAppCredentials): Promise<FetchedConversation[]> {
  const page = messagingPageOf(account);
  if (!page) return [];
  const res = await graphGet<{ data?: GraphConversation[] }>(creds.version, `/${page}/conversations`, account.access_token, {
    platform: account.platform === 'INSTAGRAM' ? 'instagram' : 'messenger',
    fields: 'participants,updated_time,messages.limit(25){id,message,from,created_time,attachments}',
    limit: '50',
  });
  const own = new Set([account.external_id, page]);
  return (res.data ?? [])
    .filter((conversation) => graphTime(conversation.updated_time).getTime() >= since.getTime())
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
