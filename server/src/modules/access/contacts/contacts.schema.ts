export const contactsTypeDefs = /* GraphQL */ `
  """
  One phone-book entry that turned out to have a Duncit account. The profile is
  the SAME PublicProfile every other people surface renders, so the follow
  button and the privacy rules cannot drift.
  """
  type ContactOnDuncit {
    profile: PublicProfile!
    "The name as it reads in the viewer's phone book, for when the account has none to show."
    contact_label: String!
    """
    True when this account's selected city is the viewer's. Duncit stores no
    coordinates, so "nearby" is a city, never a radius.
    """
    is_nearby: Boolean!
  }

  "Whether this account has synced its contacts, and what the last sync found."
  type ContactsSyncStatus {
    synced_at: String!
    "How many distinct numbers the last sync submitted."
    submitted: Int!
    "How many of them resolved to a Duncit account."
    matched: Int!
  }

  type ContactsSyncResult {
    submitted: Int!
    matched: Int!
    "Matches this sync found that the previous one had not."
    new_matches: Int!
    synced_at: String!
  }

  input ContactEntryInput {
    """
    The comparable digits of one phone-book number — the client reduces every
    number to its last ten digits before it leaves the device, and the server
    applies the same rule again, so any format the phone book uses is accepted.
    """
    phone_key: String!
    "The phone-book name, shown when the account's own name is blank."
    label: String
  }

  extend type Query {
    """
    The viewer's phone contacts who have Duncit accounts. \`search\` narrows on
    name, @handle or the phone-book label; \`nearby: true\` keeps only the ones in
    the viewer's selected city. Empty until the viewer has synced.
    """
    contactsOnDuncit(search: String, nearby: Boolean): [ContactOnDuncit!]!
    "The viewer's last contacts sync, or null when they have never synced."
    myContactsSync: ContactsSyncStatus
  }

  extend type Mutation {
    """
    Match a phone book against Duncit accounts and remember the hits.

    Every sync REPLACES the previous set: a number that left the phone book
    leaves the list. Nothing about a number that did not match is stored.
    """
    syncContacts(entries: [ContactEntryInput!]!): ContactsSyncResult!
    "Forget every stored match — the undo for having allowed contact access."
    clearMyContacts: Boolean!
  }
`;
