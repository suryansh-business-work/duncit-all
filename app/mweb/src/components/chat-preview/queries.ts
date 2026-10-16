import { gql } from '@apollo/client';
import type { ChatPreview, PodMessage } from '@duncit/gql-types';

/** A pod's or a club's chat history for its details page — any signed-in viewer. */
export const CHAT_PREVIEW = gql`
  query ChatPreview($pod_id: ID, $club_id: ID, $limit: Int, $before: String) {
    chatPreview(pod_id: $pod_id, club_id: $club_id, limit: $limit, before: $before) {
      messages {
        id
        user_id
        user_name
        user_photo
        type
        text
        createdAt
      }
      total_count
      is_member
      closed
    }
  }
`;

/** One line as the card selects it. */
export type PreviewLine = Pick<
  PodMessage,
  'id' | 'user_id' | 'user_name' | 'user_photo' | 'type' | 'text' | 'createdAt'
>;

/** `CHAT_PREVIEW` */
export interface ChatPreviewData {
  chatPreview: Pick<ChatPreview, 'total_count' | 'is_member' | 'closed'> & {
    messages: PreviewLine[];
  };
}
