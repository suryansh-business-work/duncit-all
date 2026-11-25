import gql from 'graphql-tag';

/** Marketing → Social Accounts → Publish and Ideas: Buffer's composer, queue, calendar and ideas board. */
export const socialPublishTypeDefs = gql`
  "PENDING_APPROVAL waits for a reviewer's yes before it is SCHEDULED."
  enum SocialPublishStatus {
    DRAFT
    PENDING_APPROVAL
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

  "How a post shows: in the feed (two or more media make a carousel), as a Reel, or as a 24-hour Story. Reels and Stories go to Instagram only."
  enum SocialPostType {
    FEED
    REEL
    STORY
  }

  "One network's own caption, in place of the post's text there."
  type SocialPostCaption {
    platform: SocialPlatform!
    text: String!
  }

  input SocialPostCaptionInput {
    platform: SocialPlatform!
    text: String!
  }

  "DRAFT saves it, SCHEDULE sends it at scheduled_at, NOW sends it straight away."
  enum SocialPublishMode {
    DRAFT
    SCHEDULE
    NOW
  }

  "APPROVALS is every post waiting for a decision, soonest scheduled first."
  enum SocialQueueView {
    QUEUE
    DRAFTS
    SENT
    APPROVALS
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
    "Why this network refused the post; empty when it did not. On a target waiting to be tried again, why the last try failed."
    error: String
    "The post went out but its Instagram first comment did not; why. Empty when it went or there was none."
    first_comment_error: String
    published_at: String
  }

  "One picture or clip of a post, in the order they show."
  type SocialPostMedia {
    url: String!
    type: SocialMediaType!
    "Pixels and seconds the composer measured; null when it could not."
    width: Int
    height: Int
    duration_s: Float
  }

  type SocialScheduledPost {
    id: ID!
    text: String!
    "Every piece of media in order; two or more make a carousel."
    media: [SocialPostMedia!]!
    "The first piece of media, for readers of one."
    media_url: String
    media_type: SocialMediaType
    status: SocialPublishStatus!
    scheduled_at: String
    published_at: String
    idea_id: String
    "The Reel Studio project the posted reel was cut in; empty for any other post."
    reel_project_id: String
    "The pod promotion this post was made for; empty for any other post."
    pod_id: String
    "Instagram usernames invited as collaborators; the other networks ignore them."
    collaborators: [String!]!
    post_type: SocialPostType!
    "Per-network captions in place of text; empty when every network gets the same text."
    captions: [SocialPostCaption!]!
    "Posted under the Instagram feed post or reel once it is out; empty when there is none."
    first_comment: String!
    "A reviewer must say yes before it goes out."
    needs_approval: Boolean!
    "Why the reviewer sent it back; shown to the author on the draft."
    review_note: String
    "The marketing run that waits for (or recorded) the decision."
    approval_run_id: String
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
    media_count: Int!
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

  input SocialPostMediaInput {
    url: String!
    type: SocialMediaType!
    "Pixels and seconds the composer measured, for the shape and length rules; omit when unknown."
    width: Int
    height: Int
    duration_s: Float
  }

  input SocialScheduledPostInput {
    text: String!
    "Every piece of media in order; when given it replaces media_url/media_type."
    media: [SocialPostMediaInput!]
    "One piece of media, for callers that send one."
    media_url: String
    media_type: SocialMediaType
    account_ids: [ID!]!
    mode: SocialPublishMode!
    "Required for SCHEDULE; optional on a DRAFT (it then shows on the calendar)."
    scheduled_at: String
    "The idea this post was written from; it is marked USED."
    idea_id: ID
    "The Reel Studio project this reel was cut in, so the studio can read the post's numbers back."
    reel_project_id: ID
    "The pod this post promotes (Publishing › Pod promotions)."
    pod_id: ID
    "Instagram usernames to invite as collaborators, at most 3 (the Instagram API limit); only Instagram uses them."
    collaborators: [String!]
    "With SCHEDULE or NOW, parks the post as PENDING_APPROVAL and opens an approval run."
    needs_approval: Boolean
    "FEED when omitted. REEL (one video) and STORY (one picture or video) are refused for any network but Instagram."
    post_type: SocialPostType
    "A caption per network in place of text; one per network, and only those the post goes to are kept."
    captions: [SocialPostCaptionInput!]
    "Posted under the Instagram feed post or reel once it is out; kept only when an Instagram account is picked."
    first_comment: String
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
