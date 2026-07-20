export const moderationTypeDefs = /* GraphQL */ `
  "Which layer flagged a violation — the deterministic regex pass or the GPT-4o pass."
  enum ModerationStep {
    REGEX
    AI
  }

  type ModerationViolation {
    "The pod field that broke a rule: pod_title, pod_description, pod_info, pod_hashtag or image."
    field: String!
    step: ModerationStep!
    "Short machine code, e.g. PHONE, EMAIL, LINK, PAYMENT, ABUSE, NUDITY."
    type: String!
    "Host-facing explanation of what to fix."
    message: String!
    "The offending snippet (or image URL), when available."
    evidence: String
  }

  type ModerationResult {
    "True only when the pod is clean and safe to publish."
    allowed: Boolean!
    violations: [ModerationViolation!]!
  }

  input ModeratePodContentInput {
    pod_title: String!
    pod_description: String!
    pod_info: String
    pod_hashtag: [String!]
    "Uploaded cover-image URLs, screened by GPT-4o for nudity / unwanted imagery."
    image_urls: [String!]
  }

  "One variant's moderatable text (labels + description)."
  input ModerateProductVariantInput {
    option_label: String
    size_label: String
    description: String
  }

  input ModerateProductContentInput {
    product_name: String!
    variants: [ModerateProductVariantInput!]
    "Union of every variant's image URLs, screened by GPT-4o."
    image_urls: [String!]
  }

  extend type Mutation {
    "Deep-analyses a pod's content against community guidelines before publishing."
    moderatePodContent(input: ModeratePodContentInput!): ModerationResult!
    "Deep-analyses a product listing's content against community guidelines before submit."
    moderateProductContent(input: ModerateProductContentInput!): ModerationResult!
  }
`;
