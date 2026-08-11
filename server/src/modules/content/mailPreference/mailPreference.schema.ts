export const mailPreferenceTypeDefs = /* GraphQL */ `
  """
  One kind of email, and whether this person still wants it.

  There is no label or description here on purpose: the copy is localized and
  lives in the client bundles (rule 38), so the server ships the KEY and the
  screen decides what it says in the reader's language.
  """
  type MailPreferenceCategory {
    "The email category — marketing, notification, authentication, and so on."
    category: String!
    """
    Sent whatever this says.

    Codes, receipts and notices we are obliged to send. The screen renders these
    locked rather than hiding them: "you will always get your OTP" is the answer
    to a question people actually have.
    """
    required: Boolean!
    enabled: Boolean!
  }

  "Everything one address receives, and what it has opted out of."
  type MailPreference {
    email: String!
    categories: [MailPreferenceCategory!]!
    "When the person last changed anything. Null if they never have."
    updated_at: String
  }

  "One change to one category — the row the Marketing analytics table lists."
  type MailPreferenceLog {
    id: ID!
    email: String!
    user_id: ID
    "The account behind the address, when there is one. Empty for a contact."
    user_name: String!
    category: String!
    "true = they opted back in, false = they opted out."
    enabled: Boolean!
    "Where the change was made: MWEB, NATIVE, WEBSITE, PORTAL or SERVER."
    source: String!
    source_detail: String!
    created_at: String
  }

  type MailPreferenceLogTablePage {
    rows: [MailPreferenceLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One category's standing, now and over the window."
  type MailPreferenceCategoryStat {
    category: String!
    "Addresses currently refusing this category."
    opted_out_now: Int!
    "Opt-outs inside the window."
    opt_outs: Int!
    "People who came back inside the window."
    opt_ins: Int!
  }

  type MailPreferenceBucket {
    key: String!
    count: Int!
  }

  "What the opt-out log says about reach."
  type MailPreferenceAnalytics {
    range_days: Int!
    "Addresses refusing at least one category."
    people_opted_out: Int!
    """
    Addresses refusing every category they are allowed to refuse.

    Counted apart from the number above because it is a different kind of loss:
    one category off still leaves somebody reachable, all of them off does not.
    """
    people_opted_out_all: Int!
    opt_outs: Int!
    opt_ins: Int!
    by_category: [MailPreferenceCategoryStat!]!
    "Which surface the changes were made from."
    by_source: [MailPreferenceBucket!]!
  }

  extend type Query {
    "The signed-in person's own mail preferences."
    myMailPreferences: MailPreference!
    """
    The preferences an unsubscribe link points at.

    Deliberately unauthenticated: the person clicking it is reading an email, not
    signed in, and an opt-out behind a login screen is one most people abandon.
    The signature in the link is what proves whose preferences these are.
    """
    mailPreferencesByToken(e: String!, t: String!): MailPreference
    "Opt-outs and opt-ins over a window. Defaults to 30 days, capped at 365."
    mailPreferenceAnalytics(range_days: Int): MailPreferenceAnalytics!
    "Every preference change ever made, newest first."
    mailPreferenceLogsTable(query: TableQueryInput): MailPreferenceLogTablePage!
  }

  extend type Mutation {
    "Switch one category on or off for the signed-in person."
    setMyMailPreference(category: String!, enabled: Boolean!): MailPreference!
    "Switch off everything the signed-in person is allowed to switch off."
    setAllMyMailPreferences(enabled: Boolean!): MailPreference!
    "The same two actions from an unsubscribe link, with no sign-in."
    setMailPreferenceByToken(
      e: String!
      t: String!
      category: String!
      enabled: Boolean!
    ): MailPreference!
    unsubscribeAllByToken(e: String!, t: String!): MailPreference!
  }
`;
