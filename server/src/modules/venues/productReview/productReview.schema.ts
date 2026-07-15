import gql from 'graphql-tag';

export const productReviewTypeDefs = gql`
  type ProductReview {
    id: ID!
    product_id: ID!
    user_id: ID!
    user_name: String!
    rating: Int!
    comment: String!
    images: [String!]!
    up_votes: Int!
    down_votes: Int!
    "The viewer's vote on this review: -1 (down), 0 (none) or 1 (up)."
    my_vote: Int!
    seller_reply: String!
    seller_reply_at: String
    created_at: String!
  }

  type ProductReviewSummary {
    product_id: ID!
    average_rating: Float!
    total: Int!
    "Count of reviews per star, index 0 = 1★ … index 4 = 5★."
    star_counts: [Int!]!
  }

  input CreateProductReviewInput {
    product_id: ID!
    rating: Int!
    comment: String
    images: [String!]
  }

  extend type Query {
    productReviews(product_id: ID!): [ProductReview!]!
    productReviewSummary(product_id: ID!): ProductReviewSummary!
  }

  extend type Mutation {
    "Create or update the caller's review of a product."
    createProductReview(input: CreateProductReviewInput!): ProductReview!
    "Thumbs up/down a review. vote: 1 up, -1 down, 0 clears."
    voteProductReview(review_id: ID!, vote: Int!): ProductReview!
    "Seller reply to a review of their own product (single reply)."
    replyToProductReview(review_id: ID!, reply: String!): ProductReview!
  }
`;
