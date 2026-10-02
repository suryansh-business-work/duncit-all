import gql from 'graphql-tag';

export const clubSlotRequestTypeDefs = gql`
  "OPEN until staff close it once the club's venues have published slots."
  enum ClubSlotRequestStatus {
    OPEN
    RESOLVED
  }

  "A host's request that a club's admins get its venues to open slots."
  type ClubSlotRequest {
    id: ID!
    club_id: ID!
    club_name: String!
    host_user_id: ID!
    host_name: String!
    "The number or email the club admins were sent."
    host_contact: String!
    "How many club admins were messaged."
    notified: Int!
    status: ClubSlotRequestStatus!
    resolved_at: String
    created_at: String!
    updated_at: String!
  }

  type ClubSlotRequestTablePage {
    rows: [ClubSlotRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Every venue-slot request hosts have raised — the Clubs console's list."
    clubSlotRequestsTable(query: TableQueryInput): ClubSlotRequestTablePage!
  }

  extend type Mutation {
    """
    Tell the club's admins, over email and WhatsApp, that none of its venues has
    an open slot. ALREADY_REQUESTED when this host asked about this club in the
    last day; NO_CLUB_ADMIN when the club has nobody to tell (the request is
    still recorded for staff).
    """
    requestClubVenueSlots(club_doc_id: ID!): PodHelpRequestResult!
    "Close a request once the club's venues have published slots."
    resolveClubSlotRequest(id: ID!): ClubSlotRequest!
  }
`;
