import { gql } from '@apollo/client';

/** One product review as the moderation table lists it. */
export interface StoreReviewRow {
  id: string;
  product_id: string;
  product_name: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  seller_reply: string;
  created_at: string;
}

export const STORE_REVIEWS_TABLE = gql`
  query StoreReviewsTable($query: TableQueryInput) {
    storeReviewsTable(query: $query) {
      total
      rows {
        id
        product_id
        product_name
        user_name
        rating
        comment
        images
        seller_reply
        created_at
      }
    }
  }
`;

export const REPLY_REVIEW = gql`
  mutation StoreReplyReview($id: ID!, $reply: String!) {
    storeReplyReview(id: $id, reply: $reply)
  }
`;

export const DELETE_REVIEW = gql`
  mutation StoreDeleteReview($id: ID!) {
    storeDeleteReview(id: $id)
  }
`;
