export const tutorialTypeDefs = /* GraphQL */ `
  "The language a tutorial is spoken in."
  enum TutorialLanguage {
    en
    hi
  }

  enum TutorialStatus {
    DRAFT
    PUBLISHED
  }

  "A topic tutorials are grouped under, managed from the Support portal."
  type TutorialTopic {
    id: ID!
    key: String!
    label: String!
    sort_order: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "A short how-to video members watch from the app's Tutorials menu."
  type Tutorial {
    id: ID!
    title: String!
    description: String!
    topic: String!
    language: TutorialLanguage!
    video_url: String!
    thumbnail_url: String!
    duration_sec: Int!
    status: TutorialStatus!
    sort_order: Int!
    like_count: Int!
    comment_count: Int!
    "Unique members who watched it."
    view_count: Int!
    "The signed-in member liked it (always false on the Support table)."
    liked_by_me: Boolean!
    "The signed-in member has watched it (always false on the Support table)."
    watched_by_me: Boolean!
    created_at: String!
    updated_at: String!
  }

  type TutorialPage {
    rows: [Tutorial!]!
    total: Int!
    page: Int!
    page_size: Int!
    has_more: Boolean!
  }

  type TutorialComment {
    id: ID!
    tutorial_id: ID!
    author_id: ID!
    author: User
    text: String!
    "The signed-in member wrote it, so may delete it."
    is_mine: Boolean!
    created_at: String!
  }

  type TutorialCommentPage {
    rows: [TutorialComment!]!
    total: Int!
    page: Int!
    page_size: Int!
    has_more: Boolean!
  }

  type TutorialLikeResult {
    tutorial_id: ID!
    liked: Boolean!
    like_count: Int!
  }

  type TutorialWatchResult {
    tutorial_id: ID!
    watched: Boolean!
    view_count: Int!
  }

  type TutorialViewStat {
    tutorial_id: ID!
    title: String!
    view_count: Int!
    like_count: Int!
    comment_count: Int!
  }

  "Support dashboard totals for Tutorials."
  type TutorialStats {
    total_tutorials: Int!
    published_tutorials: Int!
    "Sum of every tutorial's unique viewers."
    total_views: Int!
    "Distinct members who watched at least one tutorial."
    unique_viewers: Int!
    total_likes: Int!
    total_comments: Int!
    "Most-watched tutorials, highest first."
    top_tutorials: [TutorialViewStat!]!
  }

  "Server-side table page for the shared table engine (tutorialsTable)."
  type TutorialTablePage {
    rows: [Tutorial!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page for the shared table engine (tutorialTopicsTable)."
  type TutorialTopicTablePage {
    rows: [TutorialTopic!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input TutorialInput {
    title: String!
    description: String
    topic: String!
    language: TutorialLanguage!
    video_url: String!
    thumbnail_url: String
    duration_sec: Int
    status: TutorialStatus
    sort_order: Int
  }

  input TutorialTopicInput {
    key: String!
    label: String!
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    "Published tutorials for the signed-in member, with their own like/watched flags."
    tutorials(search: String, topic: String, language: TutorialLanguage, page: Int, page_size: Int): TutorialPage!
    "Active topics (Support staff may ask for inactive ones too)."
    tutorialTopics(include_inactive: Boolean): [TutorialTopic!]!
    "A tutorial's comments, newest first."
    tutorialComments(tutorial_id: ID!, page: Int, page_size: Int): TutorialCommentPage!
    "Server-side table page (search/filter/sort/paginate) over every tutorial."
    tutorialsTable(query: TableQueryInput): TutorialTablePage!
    "Server-side table page over tutorial topics."
    tutorialTopicsTable(query: TableQueryInput): TutorialTopicTablePage!
    tutorialStats: TutorialStats!
  }

  extend type Mutation {
    createTutorial(input: TutorialInput!): Tutorial!
    updateTutorial(tutorial_id: ID!, input: TutorialInput!): Tutorial!
    deleteTutorial(tutorial_id: ID!): Boolean!
    createTutorialTopic(input: TutorialTopicInput!): TutorialTopic!
    updateTutorialTopic(topic_id: ID!, input: TutorialTopicInput!): TutorialTopic!
    deleteTutorialTopic(topic_id: ID!): Boolean!
    toggleTutorialLike(tutorial_id: ID!): TutorialLikeResult!
    addTutorialComment(tutorial_id: ID!, text: String!): TutorialComment!
    deleteMyTutorialComment(comment_id: ID!): Boolean!
    "Idempotent: the first call per member counts one view; later calls change nothing."
    markTutorialWatched(tutorial_id: ID!): TutorialWatchResult!
  }
`;
