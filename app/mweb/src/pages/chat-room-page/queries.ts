import { gql } from '@apollo/client';

export const POD_MESSAGES = gql`
  query PodMessages($pod_id: ID!, $limit: Int) {
    me {
      user_id
    }
    podMessages(pod_id: $pod_id, limit: $limit) {
      id
      pod_id
      user_id
      user_name
      user_photo
      type
      text
      image_url
      reactions {
        user_id
        emoji
      }
      deleted
      createdAt
    }
    pod(pod_doc_id: $pod_id) {
      id
      pod_title
      pod_date_time
      pod_end_date_time
    }
  }
`;

export const SEND_MSG = gql`
  mutation Send($pod_id: ID!, $type: PodMessageType, $text: String, $image_url: String) {
    sendPodMessage(pod_id: $pod_id, type: $type, text: $text, image_url: $image_url) {
      id
    }
  }
`;

export const REACT_MSG = gql`
  mutation React($message_id: ID!, $emoji: String!) {
    reactToPodMessage(message_id: $message_id, emoji: $emoji) {
      id
      reactions {
        user_id
        emoji
      }
    }
  }
`;

export const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '😢', '🙏', '😮'];
