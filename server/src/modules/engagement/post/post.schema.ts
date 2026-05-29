export const postTypeDefs = /* GraphQL */ `
  type PostComment {
    id: ID!
    author_id: ID!
    author: User
    text: String!
    created_at: String!
  }

  type Post {
    id: ID!
    author_id: ID!
    author: User
    image_url: String!
    caption: String!
    likes: [ID!]!
    likes_count: Int!
    liked_by_me: Boolean!
    comments: [PostComment!]!
    comments_count: Int!
    created_at: String!
    updated_at: String!
  }

  input CreatePostInput {
    image_url: String!
    caption: String
  }

  extend type Query {
    posts(author_id: ID): [Post!]!
    post(post_doc_id: ID!): Post
    myPosts: [Post!]!
  }

  extend type Mutation {
    createPost(input: CreatePostInput!): Post!
    deletePost(post_doc_id: ID!): Boolean!
    togglePostLike(post_doc_id: ID!): Post!
    addPostComment(post_doc_id: ID!, text: String!): Post!
    deletePostComment(post_doc_id: ID!, comment_id: ID!): Post!
  }
`;
