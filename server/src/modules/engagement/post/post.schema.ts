export const postTypeDefs = /* GraphQL */ `
  type PostComment {
    id: ID!
    author_id: ID!
    author: User
    text: String!
    created_at: String!
  }

  "One viewer of a STORY (Bugs 2 & 4)."
  type StoryView {
    user_id: ID!
    user: User
    viewed_at: String!
  }

  type Post {
    id: ID!
    author_id: ID!
    author: User
    club_id: ID
    image_url: String!
    media_type: String!
    kind: String!
    caption: String!
    likes: [ID!]!
    likes_count: Int!
    liked_by_me: Boolean!
    comments: [PostComment!]!
    comments_count: Int!
    "Has the signed-in viewer opened this story? Drives the seen/unseen ring (Bug 2)."
    seen_by_me: Boolean!
    "How many distinct viewers have opened this story (Bug 4)."
    views_count: Int!
    expires_at: String
    created_at: String!
    updated_at: String!
  }

  input CreatePostInput {
    image_url: String!
    caption: String
    media_type: String
    kind: String
    "Attach a STORY to a club so it shows on the Club Detail page (Bug 6)."
    club_id: ID
  }

  enum FollowingFeedSource {
    PEOPLE
    CLUBS
  }

  extend type Query {
    posts(author_id: ID): [Post!]!
    post(post_doc_id: ID!): Post
    myPosts: [Post!]!
    "Active (non-expired) stories, newest first. Optionally scoped to one author."
    stories(author_id: ID): [Post!]!
    "The signed-in user's own active stories, newest first."
    myStories: [Post!]!
    "Active (non-expired) stories attached to a club, newest first (Bug 6)."
    clubStories(club_id: ID!): [Post!]!
    "Posts + active stories from the people/clubs the viewer follows, newest first."
    followingFeed(source: FollowingFeedSource!, limit: Int): [Post!]!
    "Owner-only list of who viewed a story, newest first (Bug 4)."
    storyViewers(post_doc_id: ID!): [StoryView!]!
  }

  extend type Mutation {
    createPost(input: CreatePostInput!): Post!
    deletePost(post_doc_id: ID!): Boolean!
    "Record that the signed-in viewer opened this story; idempotent (Bugs 2 & 4)."
    recordStoryView(post_doc_id: ID!): Post!
    togglePostLike(post_doc_id: ID!): Post!
    addPostComment(post_doc_id: ID!, text: String!): Post!
    deletePostComment(post_doc_id: ID!, comment_id: ID!): Post!
  }
`;
