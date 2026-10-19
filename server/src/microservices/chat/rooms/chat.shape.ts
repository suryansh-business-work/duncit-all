import { idText } from '@modules/commerce/store/store.shared';
import type { UserDisplay } from '@modules/access/user/user.display';
import { podChatDeletesAt } from './chat.retention';

/** A stored chat line, as `lean()` or `toObject()` hands it back. */
export interface StoredMessage {
  _id?: unknown;
  pod_id?: string | null;
  club_id?: string | null;
  user_id: unknown;
  type?: string | null;
  text?: string | null;
  image_url?: string | null;
  reactions?: ReadonlyArray<{ user_id: unknown; emoji: string }> | null;
  deleted?: boolean | null;
  createdAt?: Date | null;
  reply_to_id?: string | null;
  mentions?: ReadonlyArray<string> | null;
}

/** The quoted line a reply carries: who wrote it and what it said, read now. */
export interface ReplySnippet {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  type: string;
  deleted: boolean;
}

/** Someone a message @-mentions, named now so a bubble can find the token. */
export interface MentionUser {
  user_id: string;
  full_name: string;
  profile_photo: string | null;
}

/** What a message carries beyond its own row, loaded in batches by the caller. */
export interface MessageExtras {
  replyTo?: ReplySnippet | null;
  mentionUsers?: MentionUser[];
}

interface MediaRef {
  url: string;
  type?: string | null;
}

/** A pod row for `myChatRooms`, with its club populated (or still an id). */
export interface PodRoomDoc {
  _id: unknown;
  pod_id?: string | null;
  pod_title?: string | null;
  pod_date_time?: Date | null;
  pod_end_date_time?: Date | null;
  pod_attendees?: ReadonlyArray<unknown> | null;
  no_of_spots?: number | null;
  club_id?: unknown;
  pod_images_and_videos?: ReadonlyArray<MediaRef> | null;
}

/** A club row for the club room shapes. */
export interface ClubRoomDoc {
  _id: unknown;
  club_id: string;
  club_name: string;
  club_feature_images_and_videos?: ReadonlyArray<MediaRef> | null;
  super_category_id?: unknown;
  admin_user_ids?: ReadonlyArray<unknown> | null;
}

interface PopulatedClub {
  _id: unknown;
  club_id?: string | null;
  super_category_id?: unknown;
}

const isPopulatedClub = (value: unknown): value is PopulatedClub =>
  typeof value === 'object' && value !== null && '_id' in value;

const firstPhoto = (media?: ReadonlyArray<MediaRef> | null) =>
  media?.find((m) => m.type !== 'VIDEO')?.url || null;

/**
 * Shape a message for both GraphQL and the socket.
 *
 * The name and photo are resolved from the account NOW rather than read off the
 * row, which no longer stores them. `display` is passed in so a page of
 * messages costs one user query instead of one per message.
 *
 * Both paths go through here on purpose: the socket pushes this object
 * straight to connected clients, so a field resolver would never run for the
 * realtime copy and a renamed user would appear correctly on refresh and
 * wrongly the moment they posted.
 */
export function shapeMessage(doc: StoredMessage, display: UserDisplay, extras: MessageExtras = {}) {
  return {
    id: String(doc._id),
    pod_id: doc.pod_id ? String(doc.pod_id) : null,
    club_id: doc.club_id ? String(doc.club_id) : null,
    user_id: String(doc.user_id),
    user_name: display.name,
    user_photo: display.photo,
    type: doc.type,
    text: doc.text || '',
    image_url: doc.image_url || '',
    reactions: (doc.reactions || []).map((r) => ({
      user_id: String(r.user_id),
      emoji: r.emoji,
    })),
    deleted: !!doc.deleted,
    createdAt: (doc.createdAt || new Date()).toISOString(),
    reply_to_id: doc.reply_to_id ? String(doc.reply_to_id) : null,
    reply_to: extras.replyTo ?? null,
    mentions: (doc.mentions || []).map(String),
    mention_users: extras.mentionUsers ?? [],
  };
}

/** One pod room for `myChatRooms`. `club_id` is populated to
 * { _id, club_id (slug), super_category_id }. */
export function shapePodRoom(p: PodRoomDoc, retentionHours: number, now = Date.now()) {
  const club = isPopulatedClub(p.club_id) ? p.club_id : null;
  let clubId: string | null = null;
  if (club) {
    clubId = String(club._id);
  } else if (p.club_id) {
    clubId = idText(p.club_id);
  }
  // With 0 hours this is the pod's own end — the moment its room closes.
  const endsAt = podChatDeletesAt(p, 0);
  return {
    id: String(p._id),
    pod_id: String(p._id),
    pod_slug: p.pod_id || null,
    pod_title: p.pod_title,
    pod_date_time: p.pod_date_time ? new Date(p.pod_date_time).toISOString() : null,
    pod_end_date_time: p.pod_end_date_time ? new Date(p.pod_end_date_time).toISOString() : null,
    // Identity, deliberately: this drives who is IN the chat, and a
    // multi-seat buyer is still one person in it. Do not seat-adjust this
    // the way pod occupancy was — the guests they brought have no account.
    pod_attendees: (p.pod_attendees || []).map(String),
    no_of_spots: p.no_of_spots,
    club_id: clubId,
    club_slug: club?.club_id || null,
    super_category_id: idText(club?.super_category_id) || null,
    cover_url: firstPhoto(p.pod_images_and_videos),
    chat_deletes_at: podChatDeletesAt(p, retentionHours)?.toISOString() ?? null,
    closed: !!endsAt && now > endsAt.getTime(),
  };
}

/** A club room for `myClubChatRooms` / `clubChatRoom`. */
export function shapeClubRoom(
  club: ClubRoomDoc,
  opts: {
    retentionDays: number;
    canModerate: boolean;
    last?: { at: Date; text: string; type: string } | null;
  }
) {
  const last = opts.last ?? null;
  return {
    id: String(club._id),
    club_id: String(club._id),
    club_slug: club.club_id,
    club_name: club.club_name,
    cover_url: firstPhoto(club.club_feature_images_and_videos),
    super_category_id: idText(club.super_category_id) || null,
    retention_days: opts.retentionDays,
    can_moderate: opts.canModerate,
    last_message_at: last ? new Date(last.at).toISOString() : null,
    // Text lines preview as themselves; a photo or sticker is named by its
    // type, which the client words in the reader's language.
    last_message_preview: last && last.type !== 'IMAGE' ? last.text || null : null,
    last_message_type: last?.type ?? null,
  };
}
