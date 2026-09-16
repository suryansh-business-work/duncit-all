export const officialStatusTypeDefs = /* GraphQL */ `
  "Who an official status is published to."
  enum OfficialStatusScope {
    "Everybody, whichever city they are browsing."
    GLOBAL
    "Only viewers whose selected city is one of location_ids."
    LOCATION
  }

  """
  How long a status stays in the rail. The server turns this into expires_at at
  save time: HOURS_24 is now + 24h, NEVER stores null, CUSTOM stores the date
  the marketer picked.
  """
  enum OfficialStatusExpiry {
    HOURS_24
    NEVER
    CUSTOM
  }

  """
  A status Duncit itself publishes (Marketing > Status). It rides in the apps'
  status rail as a pinned Duncit tile, beside club and member stories.
  """
  type OfficialStatus {
    id: ID!
    "What the marketing team calls it in the table; never shown in the apps."
    title: String!
    media_url: String!
    media_type: CategoryMediaType!
    "Shown over the slide; empty when there is none."
    caption: String!
    "Where tapping the slide goes — an in-app path like /pod-ideas or an https link. Empty means the slide is not tappable."
    link_url: String!
    scope: OfficialStatusScope!
    "The cities it is published to; empty for a GLOBAL status."
    location_ids: [ID!]!
    "Those cities by name, for the Marketing table."
    location_names: [String!]!
    "Null means it never expires."
    expires_at: String
    "Off keeps it out of the rail without deleting it."
    is_active: Boolean!
    "Live right now: active, and not past its expiry."
    is_live: Boolean!
    "Whether the signed-in viewer has already watched it; false when signed out."
    seen_by_me: Boolean!
    "How many people have watched it."
    view_count: Int!
    "The portal account that published it."
    created_by: String!
    created_at: String!
    updated_at: String!
  }

  type OfficialStatusTablePage {
    rows: [OfficialStatus!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input OfficialStatusInput {
    title: String!
    media_url: String!
    media_type: CategoryMediaType!
    caption: String
    link_url: String
    scope: OfficialStatusScope!
    "Required and non-empty when scope is LOCATION; ignored for GLOBAL."
    location_ids: [ID!]
    expiry: OfficialStatusExpiry!
    "Required when expiry is CUSTOM, and must be in the future."
    custom_expires_at: String
    "Defaults to true."
    is_active: Boolean
  }

  extend type Query {
    "Marketing > Status. Marketing/Super admin only."
    officialStatusesTable(query: TableQueryInput): OfficialStatusTablePage!
    """
    The live Duncit statuses for the apps' rail, newest first: every GLOBAL one,
    plus the ones published to the city the viewer is browsing.
    """
    officialStatuses(location_doc_id: ID): [OfficialStatus!]!
  }

  extend type Mutation {
    createOfficialStatus(input: OfficialStatusInput!): OfficialStatus!
    updateOfficialStatus(status_doc_id: ID!, input: OfficialStatusInput!): OfficialStatus!
    deleteOfficialStatus(status_doc_id: ID!): Boolean!
    "Signed in. Marks one slide watched, so its ring stops showing as unseen."
    recordOfficialStatusView(status_doc_id: ID!): Boolean!
  }
`;
