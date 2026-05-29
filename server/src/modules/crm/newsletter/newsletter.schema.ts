export const newsletterTypeDefs = /* GraphQL */ `
  enum NewsletterSource {
    WEBSITE_FOOTER
    WEBSITE_PAGE
    MWEB
    ADMIN
    OTHER
  }

  type NewsletterSubscriber {
    id: ID!
    email: String!
    source: NewsletterSource!
    unsubscribed_at: String
    created_at: String!
    updated_at: String!
  }

  input SubscribeNewsletterInput {
    email: String!
    source: NewsletterSource
  }

  type NewsletterSubscribeResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    newsletterSubscribers: [NewsletterSubscriber!]!
  }

  extend type Mutation {
    subscribeNewsletter(input: SubscribeNewsletterInput!): NewsletterSubscribeResult!
    unsubscribeNewsletter(email: String!): Boolean!
  }
`;
