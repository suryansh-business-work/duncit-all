import { gql } from '@apollo/client';

export const PRODUCT_REVIEWS = gql`
  query PartnerProductReviews($id: ID!) {
    productReviewSummary(product_id: $id) {
      average_rating
      total
    }
    productReviews(product_id: $id) {
      id
      user_name
      rating
      comment
      images
      up_votes
      down_votes
      seller_reply
    }
  }
`;

export const REPLY_TO_REVIEW = gql`
  mutation ReplyToProductReview($review_id: ID!, $reply: String!) {
    replyToProductReview(review_id: $review_id, reply: $reply) {
      id
      seller_reply
    }
  }
`;

export interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  up_votes: number;
  down_votes: number;
  seller_reply: string;
}
