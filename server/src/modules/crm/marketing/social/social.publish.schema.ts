import gql from 'graphql-tag';

/** Marketing → Social Accounts → Publish and Ideas: Buffer's composer, queue, calendar and ideas board. */
export const socialPublishTypeDefs = gql`
  enum SocialPublishStatus {
    DRAFT
    SCHEDULED
    PUBLISHING
    PUBLISHED
    PARTIAL
    FAILED
  }

  enum SocialTargetStatus {
    PENDING
    PUBLISHED
    FAILED
  }

  enum SocialMediaType {
    IMAGE
    VIDEO
  }

  "DRAFT saves it, SCHEDULE sends it at scheduled_at, NOW sends it straight away."
  enum SocialPublishMode {
    DRAFT
    SCHEDULE
    NOW
  }

  enum SocialQueueView {
    QUEUE
    DRAFTS
    SENT
  }

  "PLANNED was written in Duncit; PUBLISHED was read back from a network."
  enum SocialCalendarKind {
    PLANNED
    PUBLISHED
  }

  enum SocialIdeaStatus {
    NEW
    USED
    DISMISSED
  }

  enum SocialIdeaFormat {
    TEXT
    IMAGE
    VIDEO
  }

  type SocialPublishTarget {
    account_id: ID!
    account_name: String!
    platform: SocialPlatform!
    status: SocialTargetStatus!
    permalink: String
    "Why this network refused the post; empty when it did not."
    error: String
    published_at: String
  }

  type SocialScheduledPost {
    id: ID!
    text: String!
    media_url: String
    media_type: SocialMediaType
    status: SocialPublishStatus!
    scheduled_at: String
    published_at: String
    idea_id: String
    targets: [SocialPublishTarget!]!
    created_at: String
    updated_at: String
  }

  type SocialCalendarItem {
    id: ID!
    kind: SocialCalendarKind!
    at: String!
    status: SocialPublishStatus!
    text: String!
    media_url: String
    permalink: String
    platforms: [SocialPlatform!]!
    account_names: [String!]!
    "Only for a post read back from a network."
    engagement: Int
  }

  type SocialIdea {
    id: ID!
    title: String!
    caption: String!
    hashtags: [String!]!
    platforms: [SocialPlatform!]!
    format: SocialIdeaFormat!
    why: String
    brief: String
    status: SocialIdeaStatus!
    created_at: String
  }

  input SocialScheduledPostInput {
    text: String!
    media_url: String
    media_type: SocialMediaType
    account_ids: [ID!]!
    mode: SocialPublishMode!
    "Required for SCHEDULE; optional on a DRAFT (it then shows on the calendar)."
    scheduled_at: String
    "The idea this post was written from; it is marked USED."
    idea_id: ID
  }

  input SocialIdeasInput {
    "What the ideas should be about; empty for anything on-brand."
    brief: String
    "Empty means the networks Duncit has accounts on."
    platforms: [SocialPlatform!]
    "1-10; 5 when missing."
    count: Int
  }

  extend type Query {
    socialScheduledPosts(view: SocialQueueView!): [SocialScheduledPost!]!
    socialScheduledPost(id: ID!): SocialScheduledPost!
    "Everything dated in [from, to): posts written here and posts read from the networks."
    socialCalendar(from: String!, to: String!): [SocialCalendarItem!]!
    socialIdeas(status: SocialIdeaStatus): [SocialIdea!]!
  }

  extend type Mutation {
    createScheduledSocialPost(input: SocialScheduledPostInput!): SocialScheduledPost!
    updateScheduledSocialPost(id: ID!, input: SocialScheduledPostInput!): SocialScheduledPost!
    "Removes it from Duncit only; a post already out stays on the network."
    deleteScheduledSocialPost(id: ID!): Boolean!
    shareScheduledSocialPostNow(id: ID!): SocialScheduledPost!
    "Send the networks that refused it again; the ones it reached are left alone."
    retryScheduledSocialPost(id: ID!): SocialScheduledPost!
    generateSocialIdeas(input: SocialIdeasInput!): [SocialIdea!]!
    setSocialIdeaStatus(id: ID!, status: SocialIdeaStatus!): SocialIdea!
    deleteSocialIdea(id: ID!): Boolean!
  }
`;
