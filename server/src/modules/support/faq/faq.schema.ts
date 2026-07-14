export const faqTypeDefs = /* GraphQL */ `
  enum FaqAudience {
    APP
    PARTNERS
  }

  enum PartnerFaqTopic {
    VENUE
    HOST
    PRODUCTS
  }

  type Faq {
    id: ID!
    super_category_id: ID
    super_category: Category
    audience: FaqAudience!
    partner_topic: PartnerFaqTopic
    question: String!
    answer: String!
    is_active: Boolean!
    sort_order: Int!
    created_at: String!
    updated_at: String!
  }

  input FaqFilterInput {
    super_category_id: ID
    audience: FaqAudience
    partner_topic: PartnerFaqTopic
    is_active: Boolean
    search: String
  }

  input CreateFaqInput {
    super_category_id: ID
    audience: FaqAudience
    partner_topic: PartnerFaqTopic
    question: String!
    answer: String!
    is_active: Boolean
    sort_order: Int
  }

  input UpdateFaqInput {
    super_category_id: ID
    audience: FaqAudience
    partner_topic: PartnerFaqTopic
    question: String
    answer: String
    is_active: Boolean
    sort_order: Int
  }

  type FaqGroup {
    super_category: Category
    faqs: [Faq!]!
  }

  enum FaqSubmissionStatus {
    NEW
    CONVERTED
    IGNORED
  }

  type FaqSubmission {
    id: ID!
    question: String!
    email: String
    super_category_slug: String
    status: FaqSubmissionStatus!
    converted_faq_id: ID
    created_at: String!
    updated_at: String!
  }

  input SubmitFaqQuestionInput {
    question: String!
    email: String
    super_category_slug: String
  }

  type FaqSubmitResult {
    ok: Boolean!
    message: String!
  }

  "Server-side table page for the shared table engine (faqsTable)."
  type FaqTablePage {
    rows: [Faq!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page for the shared table engine (faqSubmissionsTable)."
  type FaqSubmissionTablePage {
    rows: [FaqSubmission!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    faqs(filter: FaqFilterInput): [Faq!]!
    "Server-side table page (search/filter/sort/paginate) over faqs."
    faqsTable(query: TableQueryInput): FaqTablePage!
    faq(faq_doc_id: ID!): Faq
    publicFaqGroups: [FaqGroup!]!
    publicPartnerFaqs(topic: PartnerFaqTopic): [Faq!]!
    faqSubmissions(status: FaqSubmissionStatus): [FaqSubmission!]!
    "Server-side table page (search/filter/sort/paginate) over FAQ submissions."
    faqSubmissionsTable(query: TableQueryInput): FaqSubmissionTablePage!
  }

  extend type Mutation {
    createFaq(input: CreateFaqInput!): Faq!
    updateFaq(faq_doc_id: ID!, input: UpdateFaqInput!): Faq!
    deleteFaq(faq_doc_id: ID!): Boolean!
    submitFaqQuestion(input: SubmitFaqQuestionInput!): FaqSubmitResult!
    updateFaqSubmissionStatus(
      faq_submission_id: ID!
      status: FaqSubmissionStatus!
      converted_faq_id: ID
    ): FaqSubmission!
  }
`;
