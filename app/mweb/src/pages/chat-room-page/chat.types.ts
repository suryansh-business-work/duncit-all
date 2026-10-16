import type {
  ChatParticipants,
  ChatRoom,
  ClubChatRoom,
  PodChatInfo,
  PodMessage,
} from '@duncit/gql-types';

/** One chat line as the room documents select it — a pod's or a club's. */
export type ChatMessage = Omit<PodMessage, '__typename'>;

/** What arrives over the socket for a reaction or a delete: at least the id,
 * and the room it belongs to. */
export type ChatSocketMessage = Pick<ChatMessage, 'id'> & Partial<ChatMessage>;

interface Me {
  user_id: string;
}

/** `CHAT_PARTICIPANTS` */
export interface ChatParticipantsData {
  chatParticipants: ChatParticipants;
}

/** The pod a pod room belongs to, for its header link. */
export interface LinkedPod {
  id: string;
  pod_title: string;
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
  pod_id?: string | null;
  club_slug?: string | null;
}

/** `POD_MESSAGES` */
export interface PodRoomData {
  me?: Me | null;
  podMessages: ChatMessage[];
  podChatInfo: Pick<PodChatInfo, 'chat_deletes_at' | 'closed' | 'can_moderate'>;
  pod?: LinkedPod | null;
}

/** `CLUB_MESSAGES` */
export interface ClubRoomData {
  me?: Me | null;
  clubMessages: ChatMessage[];
  clubChatRoom: Pick<ClubChatRoom, 'id' | 'club_slug' | 'club_name' | 'retention_days' | 'can_moderate'>;
}

interface SuperCategoryRef {
  id: string;
  slug: string;
}

/** The Chats page's Pods tab. */
export interface PodChatRoomsData {
  myChatRooms: Pick<
    ChatRoom,
    | 'id'
    | 'pod_title'
    | 'pod_date_time'
    | 'pod_end_date_time'
    | 'pod_attendees'
    | 'no_of_spots'
    | 'cover_url'
    | 'club_id'
    | 'super_category_id'
  >[];
  superCategories: SuperCategoryRef[];
}

export type ClubChatRoomRow = Pick<
  ClubChatRoom,
  | 'id'
  | 'club_name'
  | 'cover_url'
  | 'super_category_id'
  | 'last_message_at'
  | 'last_message_preview'
  | 'last_message_type'
>;

/** The Chats page's Clubs tab. */
export interface ClubChatRoomsData {
  myClubChatRooms: ClubChatRoomRow[];
  superCategories: SuperCategoryRef[];
}
