export const googleAnalyticsTypeDefs = /* GraphQL */ `
  "A Duncit website that can load a Google Analytics tag — the key it passes to googleAnalyticsTag."
  enum TrackedWebsite {
    MAIN
    PARTNERS
    ADS
    EARNWITH
    STATUS
    ECOMM
  }

  "One website's Google Analytics tag, as set in Tech → Google Analytics."
  type GoogleAnalyticsSite {
    site: TrackedWebsite!
    "The GA4 measurement id (G-…), or null when this website has none."
    measurement_id: String
    "Off keeps the id on file but stops the website loading the tag."
    enabled: Boolean!
    "ISO time of the last change, or null when this website has no tag."
    updated_at: String
  }

  input GoogleAnalyticsSiteInput {
    site: TrackedWebsite!
    measurement_id: String!
    enabled: Boolean!
  }

  extend type Query {
    "Every Duncit website, with its tag where one is set."
    googleAnalyticsSites: [GoogleAnalyticsSite!]!
    "The measurement id a website loads, or null when it has none or it is switched off. Public: every page of every website asks for it."
    googleAnalyticsTag(site: TrackedWebsite!): String
  }

  extend type Mutation {
    "Sets or replaces one website's tag."
    saveGoogleAnalyticsSite(input: GoogleAnalyticsSiteInput!): GoogleAnalyticsSite!
    "Removes one website's tag. The website stops loading Google Analytics."
    deleteGoogleAnalyticsSite(site: TrackedWebsite!): Boolean!
  }
`;
