/**
 * The private chat between a pod's hosts and the venue it is booked at —
 * shared by mWeb, the native app and the Partners app (rules 29 + 56).
 *
 * The server decides who is in a thread (the pod's hosts and the venue's
 * owner) and which pod owns it (a recurring pod's parent). Lines come back as
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

/** Socket events: join with the pod id (acks ok/err), lines arrive as a PodMessage. */
export const VENUE_CHAT_SOCKET = {
  join: 'join_venue_chat',
  leave: 'leave_venue_chat',
  message: 'venue_chat_message',
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
    }
  }
`;

export const VENUE_CHAT_MESSAGES_SDL = `
  query VenueChatMessages($pod_id: ID!, $limit: Int, $before: String) {
    venueChatMessages(pod_id: $pod_id, limit: $limit, before: $before) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

export const SEND_VENUE_CHAT_MESSAGE_SDL = `
  mutation SendVenueChatMessage($pod_id: ID!, $type: PodMessageType, $text: String, $image_url: String) {
    sendVenueChatMessage(pod_id: $pod_id, type: $type, text: $text, image_url: $image_url) {${VENUE_CHAT_LINE_FIELDS}}
  }
`;

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
}

/** A host talks to the venue about a pod; the venue talks to that pod's hosts. */
export function venueChatCounterpart(room: VenueChatRoomInfo): VenueChatCounterpart {
  const when = room.pod_date_time ?? null;
  if (room.my_side === 'VENUE') return { name: room.pod_title, photo: null, podTitle: null, when };
  return { name: room.venue_name, photo: room.venue_photo || null, podTitle: room.pod_title || null, when };
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
