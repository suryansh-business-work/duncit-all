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

  "Server-side table page for the shared table engine (newsletterSubscribersTable)."
  type NewsletterSubscriberTablePage {
    rows: [NewsletterSubscriber!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SubscribeNewsletterInput {
    email: String!
    source: NewsletterSource
    "Human check, required only when nobody is signed in. See the captchaChallenge query."
    captcha_token: String
    captcha_answer: String
  }

  type NewsletterSubscribeResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    newsletterSubscribers: [NewsletterSubscriber!]!
    newsletterSubscribersTable(query: TableQueryInput): NewsletterSubscriberTablePage!
  }

  extend type Mutation {
    subscribeNewsletter(input: SubscribeNewsletterInput!): NewsletterSubscribeResult!
    unsubscribeNewsletter(email: String!): Boolean!
  }
`;
