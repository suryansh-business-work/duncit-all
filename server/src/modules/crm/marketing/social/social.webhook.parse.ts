import type { SocialPlatform } from './social.types';

/**
 * Meta's webhook payload, turned into the two events the Inbox stores. Pure:
 * no lookups, so every payload shape is pinned by unit tests.
 *
 * - `object: "instagram"` — the entry id is the Instagram account's id;
 *   `messaging[]` are DMs (our own sends come back with `is_echo`), and
 *   `changes[field=comments]` are comments on its media.
 * - `object: "page"` — the entry id is the Page's id; `messaging[]` are
 *   Messenger DMs, `changes[field=feed]` with `item: comment` are comments.
 *
 * Reactions, read receipts and "seen" carry no message and are dropped, as is
 * a comment written by the account itself and a deleted message.
 */
export interface DmEvent {
  kind: 'DM';
  platform: SocialPlatform;
  account_external_id: string;
  participant_id: string;
  direction: 'IN' | 'OUT';
  external_id: string;
  text: string;
  attachments: { type: string; url: string }[];
  sent_at: Date;
}

export interface CommentEvent {
  kind: 'COMMENT';
  platform: SocialPlatform;
  account_external_id: string;
  external_id: string;
  post_external_id: string;
  text: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  published_at: Date;
}

export type WebhookEvent = DmEvent | CommentEvent;

interface RawMessaging {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
  postback?: { mid?: string; title?: string; payload?: string };
}

interface RawChange {
  field?: string;
  value?: Record<string, unknown>;
}

interface RawEntry {
  id?: string;
  time?: number;
  messaging?: RawMessaging[];
  changes?: RawChange[];
}

/** Meta stamps milliseconds on messaging and seconds on some changes. */
export function webhookTime(value: unknown, fallback = new Date()): Date {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return fallback;
  return new Date(n < 1e12 ? n * 1000 : n);
}

const str = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

function dmOf(platform: SocialPlatform, accountId: string, item: RawMessaging): DmEvent | null {
  const message = item.message;
  const postback = item.postback;
  const mid = message?.mid ?? postback?.mid ?? '';
  if (!mid || message?.is_deleted) return null;
  const sender = item.sender?.id ?? '';
  const recipient = item.recipient?.id ?? '';
  const outbound = message?.is_echo === true || sender === accountId;
  const participant = outbound ? recipient : sender;
  if (!participant) return null;
  return {
    kind: 'DM',
    platform,
    account_external_id: accountId,
    participant_id: participant,
    direction: outbound ? 'OUT' : 'IN',
    external_id: mid,
    text: message?.text ?? postback?.title ?? '',
    attachments: (message?.attachments ?? []).map((a) => ({ type: a.type ?? 'file', url: a.payload?.url ?? '' })).filter((a) => a.url),
    sent_at: webhookTime(item.timestamp),
  };
}

function instagramComment(accountId: string, change: RawChange, entryTime: unknown): CommentEvent | null {
  if (change.field !== 'comments') return null;
  const value = record(change.value);
  const from = record(value.from);
  const id = str(value.id);
  const media = str(record(value.media).id);
  if (!id || !media || str(from.id) === accountId) return null;
  return {
    kind: 'COMMENT',
    platform: 'INSTAGRAM',
    account_external_id: accountId,
    external_id: id,
    post_external_id: media,
    text: str(value.text),
    author_id: str(from.id),
    author_name: str(from.username),
    author_handle: str(from.username),
    published_at: webhookTime(entryTime),
  };
}

function pageComment(accountId: string, change: RawChange): CommentEvent | null {
  const value = record(change.value);
  if (change.field !== 'feed' || value.item !== 'comment' || value.verb === 'remove') return null;
  const from = record(value.from);
  const id = str(value.comment_id);
  const post = str(value.post_id);
  if (!id || !post || str(from.id) === accountId) return null;
  return {
    kind: 'COMMENT',
    platform: 'FACEBOOK',
    account_external_id: accountId,
    external_id: id,
    post_external_id: post,
    text: str(value.message),
    author_id: str(from.id),
    author_name: str(from.name),
    author_handle: '',
    published_at: webhookTime(value.created_time),
  };
}

/** The webhook object each platform's events come under. */
const OBJECT_PLATFORM: Readonly<Record<string, SocialPlatform>> = { instagram: 'INSTAGRAM', page: 'FACEBOOK' };

/** The DMs and comments one entry (one account) carries, DMs first as Meta lists them. */
function entryEvents(platform: SocialPlatform, raw: RawEntry): WebhookEvent[] {
  const accountId = str(raw?.id);
  if (!accountId) return [];
  const dms = (raw.messaging ?? []).map((item) => dmOf(platform, accountId, item));
  const comments = (raw.changes ?? []).map((change) =>
    platform === 'INSTAGRAM' ? instagramComment(accountId, change, raw.time) : pageComment(accountId, change)
  );
  return [...dms, ...comments].filter((event): event is WebhookEvent => event !== null);
}

export function parseMetaWebhook(payload: unknown): WebhookEvent[] {
  const body = record(payload);
  const object = str(body.object);
  // Own keys only: a payload naming "constructor" must not reach Object's prototype.
  const platform = Object.hasOwn(OBJECT_PLATFORM, object) ? OBJECT_PLATFORM[object] : null;
  if (!platform || !Array.isArray(body.entry)) return [];
  return (body.entry as RawEntry[]).flatMap((raw) => entryEvents(platform, raw));
}
