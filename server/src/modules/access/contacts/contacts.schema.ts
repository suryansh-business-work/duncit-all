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
    "How many reached nobody — the size of the invite list."
    invitable: Int!
  }

  type ContactsSyncResult {
    submitted: Int!
    matched: Int!
    "Matches this sync found that the previous one had not."
    new_matches: Int!
    "How many submitted numbers reached nobody — who the invite list holds."
    invitable: Int!
    synced_at: String!
  }

  """
  One phone-book number that reached no Duncit account, and so can be invited.
  The number itself never comes back to the client — it already has the phone
  book; \`phone_key\` is what an invite is asked for by.
  """
  type ContactToInvite {
    phone_key: String!
    "The name it is saved under in the viewer's phone book."
    contact_label: String!
    "When an invite last went to this number, or null while none has."
    invited_at: String
  }

  "What one press of Invite / Invite all actually did."
  type ContactInviteResult {
    "How many numbers this call tried."
    requested: Int!
    sent: Int!
    "Held back — switched off, already invited, or opted out."
    skipped: Int!
    failed: Int!
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
    """
    The viewer's phone contacts who are NOT on Duncit — who an invite is for.
    \`search\` narrows on the phone-book name. Empty until the viewer has synced.
    """
    contactsToInvite(search: String): [ContactToInvite!]!
  }

  extend type Mutation {
    """
    Match a phone book against Duncit accounts and remember the hits.

    Every sync REPLACES both lists: a number that left the phone book leaves
    them. A number that matched is kept as an account id and nothing else; a
    number that did not is kept as its comparable key and the name it is saved
    under, which is what the invite list is. Clearing contacts deletes both.
    """
    syncContacts(entries: [ContactEntryInput!]!): ContactsSyncResult!
    """
    WhatsApp an invite to contacts who are not on Duncit yet.

    An empty \`phone_keys\` invites everyone still waiting — the "Invite all"
    button — a batch at a time. A number already invited is never texted twice:
    one invite per number per inviter, enforced by the message log's unique slot.
    """
    inviteContacts(phone_keys: [String!]): ContactInviteResult!
    "Forget every stored match — the undo for having allowed contact access."
    clearMyContacts: Boolean!
  }
`;
