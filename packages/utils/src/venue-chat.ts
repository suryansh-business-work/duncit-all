/**
 * The private chat between a pod's hosts and the venue it is booked at —
 * shared by mWeb, the native app and the Partners app (rules 29 + 56).
 *
 * The server decides who is in a thread (the pod's hosts and the venue's
 * owner) and which pod owns it. Lines come back as
 * the `PodMessage` shape every chat bubble already renders.
 */

/** Where a thread opens on mWeb and the app — also the push link. */
export const venueChatPath = (podId: string): string => `/venue-chat/${encodeURIComponent(podId)}`;

/** The pod id a thread's path opens (`/venue-chat/:podId`, also the push link), or null. */
export function venueChatPodIdFromPath(path: string | null | undefined): string | null {
  const segment = /^\/venue-chat\/([^/?#]+)/.exec(path ?? '')?.[1];
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    // A malformed escape is not a pod id anyone was sent.
    return null;
  }
}

/** Whether a pod has a venue thread at all: only a pod booked at a venue does. */
export const hasVenueChat = (pod: { venue_id?: string | null } | null | undefined): boolean => !!pod?.venue_id;

/**
 * Whether a failure (its GraphQL `extensions.code`, or the socket join's
 * error) means "this thread is not yours" rather than "try again": the server
 * answers FORBIDDEN alike for a stranger, a pod with no venue and no pod.
 */
export const isVenueChatUnavailable = (code: string | null | undefined): boolean => code === 'FORBIDDEN';

/**
 * Socket events: join with the pod id (acks ok/err); new lines arrive as a
 * PodMessage, a changed line (edited, reacted to, a counter revised) as the
 * whole line again, a removed one as `{ id, pod_id }`, and a member reading the
 * thread as their `VenueChatReadMark`.
 */
export const VENUE_CHAT_SOCKET = {
  join: 'join_venue_chat',
  leave: 'leave_venue_chat',
  message: 'venue_chat_message',
  update: 'venue_chat_update',
  remove: 'venue_chat_delete',
  read: 'venue_chat_read',
} as const;

/** How many lines one page reads. */
export const VENUE_CHAT_PAGE = 50;

const VENUE_CHAT_LINE_FIELDS = `
  id
  pod_id
  user_id
  user_name
  user_photo
  type
  text
  image_url
  deleted
  createdAt
  edited_at
  reactions {
    user_id
    emoji
  }
  offer {
    slot_id
    round
    event
    by
    model
    rate
    min_guests
    max_guests
    offerings
    note
    start_at
    end_at
    space_label
    pets
    venue_receives_min
    venue_receives_max
    total_min
    total_max
    expires_at
    reason
    images
  }
`;

export const VENUE_CHAT_ROOM_SDL = `
  query VenueChatRoom($pod_id: ID!) {
    venueChatRoom(pod_id: $pod_id) {
      pod_id
      pod_title
      pod_date_time
      venue_id
      venue_name
      venue_photo
      my_side
      pod_is_free
      counterpart_name
      counterpart_phone
      counterpart_email
      host {
        user_id
        name
        photo
        username
        bio
        phone
        email
      }
      venue {
        venue_id
        venue_name
        photo
        venue_type
        capacity
        address
        name
        phone
        email
      }
      read_marks {
        user_id
        side
        name
        photo
        last_read_at
      }
    }
  }
`;

export const VENUE_CHAT_MESSAGES_SDL = `
  query VenueChatMessages($pod_id: ID!, $limit: Int, $before: String, $mark_read: Boolean) {
    venueChatMessages(pod_id: $pod_id, limit: $limit, before: $before, mark_read: $mark_read) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

export const SEND_VENUE_CHAT_MESSAGE_SDL = `
  mutation SendVenueChatMessage($pod_id: ID!, $type: PodMessageType, $text: String, $image_url: String) {
    sendVenueChatMessage(pod_id: $pod_id, type: $type, text: $text, image_url: $image_url) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

/** React to a line; the same emoji again takes the reaction back. Answers the line as everyone now sees it. */
export const REACT_TO_VENUE_CHAT_MESSAGE_SDL = `
  mutation ReactToVenueChatMessage($message_id: ID!, $emoji: String!) {
    reactToVenueChatMessage(message_id: $message_id, emoji: $emoji) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

/** The author rewrites their own text line. */
export const EDIT_VENUE_CHAT_MESSAGE_SDL = `
  mutation EditVenueChatMessage($message_id: ID!, $text: String!) {
    editVenueChatMessage(message_id: $message_id, text: $text) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

/** The author removes their own text or photo line. */
export const DELETE_VENUE_CHAT_MESSAGE_SDL = `
  mutation DeleteVenueChatMessage($message_id: ID!) {
    deleteVenueChatMessage(message_id: $message_id)
  }
`;

/** The thread is open and read to the end: the other side sees the reader's face move to the newest line. */
export const MARK_VENUE_CHAT_READ_SDL = `
  mutation MarkVenueChatRead($pod_id: ID!) {
    markVenueChatRead(pod_id: $pod_id)
  }
`;

const VENUE_CHAT_THREAD_FIELDS = `
  rows {
    pod_id
    pod_title
    pod_date_time
    venue_id
    venue_name
    host_name
    host_photo
    last_message
    last_message_is_photo
    last_message_at
    last_message_side
    unread_count
  }
  total
`;

/** The venue owner's chat inbox — one venue, or all of theirs. */
export const MY_VENUE_CHAT_THREADS_SDL = `
  query MyVenueChatThreads($venue_id: ID, $limit: Int, $offset: Int) {
    myVenueChatThreads(venue_id: $venue_id, limit: $limit, offset: $offset) {${VENUE_CHAT_THREAD_FIELDS}}
  }
`;

/** Duncit staff: one venue's chats (Venues console, read-only). */
export const ADMIN_VENUE_CHAT_THREADS_SDL = `
  query AdminVenueChatThreads($venue_id: ID!, $limit: Int, $offset: Int) {
    adminVenueChatThreads(venue_id: $venue_id, limit: $limit, offset: $offset) {${VENUE_CHAT_THREAD_FIELDS}}
  }
`;

/** Duncit staff: one venue chat's lines, read-only. */
export const ADMIN_VENUE_CHAT_MESSAGES_SDL = `
  query AdminVenueChatMessages($pod_id: ID!, $limit: Int, $before: String) {
    adminVenueChatMessages(pod_id: $pod_id, limit: $limit, before: $before) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

/** How many threads one inbox page reads. */
export const VENUE_CHAT_THREADS_PAGE = 30;

/** One inbox row, as the thread SDLs above select it. */
export interface VenueChatThreadRow {
  pod_id: string;
  pod_title: string;
  pod_date_time?: string | null;
  venue_id: string;
  venue_name: string;
  host_name: string;
  host_photo?: string | null;
  last_message?: string | null;
  last_message_is_photo: boolean;
  last_message_at?: string | null;
  last_message_side?: VenueChatSide | null;
  unread_count: number;
}

/** The two sides of a thread, as `venueChatRoom.my_side` names them. */
export type VenueChatSide = 'HOST' | 'VENUE';

/** The thread itself, as VENUE_CHAT_ROOM_SDL selects it. */
export interface VenueChatRoomInfo {
  pod_id: string;
  pod_title: string;
  pod_date_time?: string | null;
  venue_id: string;
  venue_name: string;
  venue_photo?: string | null;
  my_side: VenueChatSide;
  /** A free pod: its host settles the venue directly, so offer lines show no money. */
  pod_is_free?: boolean | null;
  /** The person on the other side: the pod's lead host for the venue, the venue's listed contact for a host. */
  counterpart_name?: string | null;
  counterpart_phone?: string | null;
  counterpart_email?: string | null;
  /** The pod's lead host, for the contact sheet; absent from older servers, null when none is on record. */
  host?: VenueChatHostCard | null;
  /** The venue, for the contact sheet; absent from older servers. */
  venue?: VenueChatVenueCard | null;
  /** How far every other member has read the thread; absent from older servers. */
  read_marks?: readonly VenueChatReadMark[] | null;
}

/** The pod's lead host on the thread's contact sheet (`VenueChatHostCard`). Empty strings: not on record. */
export interface VenueChatHostCard {
  user_id: string;
  name: string;
  photo?: string | null;
  username: string;
  bio: string;
  phone: string;
  email: string;
}

/** The venue on the thread's contact sheet (`VenueChatVenueCard`); `name` is the person to ask for. */
export interface VenueChatVenueCard {
  venue_id: string;
  venue_name: string;
  photo?: string | null;
  venue_type: string;
  capacity: number;
  address: string;
  name: string;
  phone: string;
  email: string;
}

/** How far one member has read a thread (`VenueChatReadMark`): every line at or before `last_read_at` is seen. */
export interface VenueChatReadMark {
  user_id: string;
  side: VenueChatSide;
  name: string;
  photo?: string | null;
  last_read_at: string;
}

/** How to reach the other side outside the chat — each null when none is on record. */
export interface VenueChatContact {
  name: string | null;
  phone: string | null;
  email: string | null;
}

/** Who the reader is talking to, for the thread's header. */
export interface VenueChatCounterpart {
  /** The venue's name for a host; the pod's title for the venue. */
  name: string;
  /** The venue's photo for a host; none for the venue (a pod has no face). */
  photo: string | null;
  /** The pod the thread is about, when `name` is not already it (the host's view). */
  podTitle: string | null;
  /** When the pod runs (ISO), for the header's second line. */
  when: string | null;
  /** Their phone and email, for the header's contact row; null when neither is on record. */
  contact: VenueChatContact | null;
}

/** The counterpart's contact, or null when the room carries no way to reach them. */
function contactOf(room: VenueChatRoomInfo): VenueChatContact | null {
  const phone = room.counterpart_phone?.trim() || null;
  const email = room.counterpart_email?.trim() || null;
  if (!phone && !email) return null;
  return { name: room.counterpart_name?.trim() || null, phone, email };
}

/** A host talks to the venue about a pod; the venue talks to that pod's hosts. */
export function venueChatCounterpart(room: VenueChatRoomInfo): VenueChatCounterpart {
  const when = room.pod_date_time ?? null;
  const contact = contactOf(room);
  if (room.my_side === 'VENUE') return { name: room.pod_title, photo: null, podTitle: null, when, contact };
  return { name: room.venue_name, photo: room.venue_photo || null, podTitle: room.pod_title || null, when, contact };
}

/** What an OFFER line records: who moved, and how (`VenueChatOffer.event`). */
export type VenueChatOfferEvent = 'OFFER' | 'COUNTER' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

/** One move of a booking offer, as an OFFER line carries it (money in rupees). */
export interface VenueChatOfferMove {
  slot_id: string;
  round: number;
  event: string;
  /** HOST, VENUE, or SYSTEM for an answer that ran late. */
  by: string;
  model: string;
  rate: number;
  min_guests: number;
  max_guests: number;
  offerings: readonly string[];
  note: string;
  start_at: string;
  end_at: string;
  space_label: string;
  pets: boolean;
  venue_receives_min: number;
  venue_receives_max: number;
  total_min: number;
  total_max: number;
  expires_at?: string | null;
  reason: string;
  /** Photos attached to a counter; absent from older servers. */
  images?: readonly string[] | null;
}

/** A line, as the three operations above select it. */
export interface VenueChatLine {
  id: string;
  pod_id?: string | null;
  user_id: string;
  user_name?: string | null;
  user_photo?: string | null;
  type: string;
  text?: string | null;
  image_url?: string | null;
  deleted: boolean;
  createdAt: string;
  /** When its author last changed it; null (or absent, older servers) while it is as first sent. */
  edited_at?: string | null;
  /** One row per member per emoji; absent from older servers. */
  reactions?: readonly { user_id: string; emoji: string }[] | null;
  /** Set on an OFFER line: the move it records. */
  offer?: VenueChatOfferMove | null;
}

/** The OFFER line the thread ends on (lines are oldest first), or null — only it may still be answered. */
export function newestOfferLineId(lines: readonly Pick<VenueChatLine, 'id' | 'type' | 'offer'>[]): string | null {
  const newest = [...lines].reverse().find((line) => line.type === 'OFFER' && !!line.offer);
  return newest ? newest.id : null;
}

/** The live offer an OFFER bubble's buttons answer (`podVenueOffer`); null when the pod has none any more. */
export interface LiveVenueOffer {
  round: number;
  status: string;
  awaiting?: string | null;
}

const OPEN_MOVES: ReadonlySet<string> = new Set(['OFFER', 'COUNTER']);
const CLOSING_MOVES: ReadonlySet<string> = new Set(['DECLINED', 'EXPIRED']);

/** OFFER and COUNTER wait on an answer; every other move closed the offer. */
export const isOpenOfferMove = (event: string): boolean => OPEN_MOVES.has(event);

/**
 * What an OFFER line's bubble lets the reader do. Accept, Reject or Counter
 * show only on the move still waiting for THEM: the thread's newest offer line,
 * the live offer's own round, still open, and their turn. Edit and Withdraw
 * show only on their OWN newest counter while it waits on the other side, until
 * the other side has seen it (`seen`). Send a new offer shows only to a host, on
 * the newest line when it closed the offer (declined or ran out) — a declined
 * hold is released, so there is no live offer to read then. Every older line is
 * a record and offers nothing.
 */
export function venueChatOfferActions(
  move: Readonly<Pick<VenueChatOfferMove, 'event' | 'round' | 'by'>>,
  context: { side: VenueChatSide; newest: boolean; live: Readonly<LiveVenueOffer> | null; seen?: boolean }
): { answer: boolean; sendNew: boolean; revise: boolean } {
  const { side, newest, live } = context;
  const none = { answer: false, sendNew: false, revise: false };
  if (!newest) return none;
  if (CLOSING_MOVES.has(move.event)) return { ...none, sendNew: side === 'HOST' };
  if (!live || !OPEN_MOVES.has(move.event)) return none;
  const current = (live.status === 'SENT' || live.status === 'COUNTERED') && live.round === move.round;
  const revise = current && move.event === 'COUNTER' && move.by === side && live.awaiting !== side && !context.seen;
  return { answer: current && live.awaiting === side, sendNew: false, revise };
}

/** An OFFER bubble's heading by who moved and how: as the mover reads it, and as the other side does. */
const OFFER_LINE_TITLE: Readonly<Record<string, { mine: string; theirs: string }>> = {
  'HOST:OFFER': { mine: 'availability.offers.chat.title.youOffered', theirs: 'availability.offers.chat.title.hostOffered' },
  'HOST:COUNTER': { mine: 'availability.offers.chat.title.youCountered', theirs: 'availability.offers.chat.title.hostCountered' },
  'VENUE:COUNTER': { mine: 'availability.offers.chat.title.youCountered', theirs: 'availability.offers.chat.title.venueCountered' },
  'HOST:ACCEPTED': { mine: 'availability.offers.chat.title.youAccepted', theirs: 'availability.offers.chat.title.hostAccepted' },
  'VENUE:ACCEPTED': { mine: 'availability.offers.chat.title.youAccepted', theirs: 'availability.offers.chat.title.venueAccepted' },
  'HOST:DECLINED': { mine: 'availability.offers.chat.title.youDeclined', theirs: 'availability.offers.chat.title.hostDeclined' },
  'VENUE:DECLINED': { mine: 'availability.offers.chat.title.youDeclined', theirs: 'availability.offers.chat.title.venueDeclined' },
};

/** The key an offer ran out under — the same for both sides, since nobody moved. */
const OFFER_EXPIRED_TITLE = 'availability.offers.chat.title.expired';

/** An OFFER bubble's heading key for the reader ("You countered", "The venue countered", …), or '' for a move this client does not know. */
export function venueChatOfferTitleKey(move: Readonly<Pick<VenueChatOfferMove, 'event' | 'by'>>, side: VenueChatSide): string {
  if (move.event === 'EXPIRED') return OFFER_EXPIRED_TITLE;
  const title = OFFER_LINE_TITLE[`${move.by}:${move.event}`];
  if (!title) return '';
  return move.by === side ? title.mine : title.theirs;
}

/**
 * Adds lines (a fresh page, a sent line, a socket frame) to what is on screen:
 * one copy of each id, oldest first — so the socket echo of a line the sender
 * already added from the mutation never shows twice.
 */
export function mergeVenueChatLines<T extends VenueChatLine>(current: readonly T[], incoming: readonly T[]): T[] {
  const byId = new Map(current.map((line) => [line.id, line]));
  for (const line of incoming) byId.set(line.id, line);
  return [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
