export const faqTypeDefs = /* GraphQL */ `
  type Faq {
    id: ID!
    super_category_id: ID
    super_category: Category
    question: String!
    answer: String!
    is_active: Boolean!
    sort_order: Int!
    created_at: String!
    updated_at: String!
  }

  input FaqFilterInput {
    super_category_id: ID
    is_active: Boolean
    search: String
  }

  input CreateFaqInput {
    super_category_id: ID
    question: String!
    answer: String!
    is_active: Boolean
    sort_order: Int
  }

  input UpdateFaqInput {
    super_category_id: ID
    question: String
    answer: String
    is_active: Boolean
    sort_order: Int
  }

  type FaqGroup {
    super_category: Category
    faqs: [Faq!]!
  }

  extend type Query {
    faqs(filter: FaqFilterInput): [Faq!]!
    faq(faq_doc_id: ID!): Faq
    publicFaqGroups: [FaqGroup!]!
  }

  extend type Mutation {
    createFaq(input: CreateFaqInput!): Faq!
    updateFaq(faq_doc_id: ID!, input: UpdateFaqInput!): Faq!
    deleteFaq(faq_doc_id: ID!): Boolean!
  }
`;
