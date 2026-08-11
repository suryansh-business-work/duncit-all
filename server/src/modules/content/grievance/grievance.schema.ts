export const grievanceTypeDefs = /* GraphQL */ `
  enum GrievanceStatus {
    RECEIVED
    IN_REVIEW
    RESOLVED
    REJECTED
  }

  "Which surface the grievance was raised from."
  enum GrievanceSource {
    APP
    WEBSITE
    PORTAL
    "Arrived in a mailbox connected under Mail Automation."
    EMAIL
  }

  type GrievanceTicket {
    id: ID!
    "Permanent, globally unique handle (GRV-000001). Never edited, never reused."
    grievance_no: String!
    source: GrievanceSource!
    name: String!
    email: String!
    phone: String!
    "Optional — a grievance is answerable without a postal address."
    address: String!
    subject: String!
    description: String!
    status: GrievanceStatus!
    "What the legal team did about it. Staff-only."
    resolution: String!
    resolved_at: String
    handled_by_name: String!
    created_at: String!
    updated_at: String!
  }

  type GrievanceTicketTablePage {
    rows: [GrievanceTicket!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type GrievanceStatusCount {
    status: GrievanceStatus!
    count: Int!
  }

  type GrievanceStats {
    total: Int!
    by_status: [GrievanceStatusCount!]!
  }

  """
  The Grievance Officer Duncit publishes.

  Readable by anyone — publishing these details is the whole purpose of the
  record, so the app, the website and the acknowledgement email all quote the
  same one instead of keeping copies.
  """
  type GrievanceOfficer {
    name: String!
    email: String!
    phone: String!
    "Optional."
    address: String!
    updated_at: String
  }

  input SubmitGrievanceInput {
    name: String!
    email: String!
    phone: String!
    address: String
    subject: String!
    description: String!
    source: GrievanceSource
  }

  input UpdateGrievanceStatusInput {
    status: GrievanceStatus
    resolution: String
  }

  input SaveGrievanceOfficerInput {
    name: String!
    email: String!
    phone: String!
    address: String
  }

  extend type Query {
    grievanceTicketsTable(query: TableQueryInput): GrievanceTicketTablePage!
    grievanceTicket(id: ID!): GrievanceTicket
    grievanceStats: GrievanceStats!
    "Public: the officer the app and website publish."
    grievanceOfficer: GrievanceOfficer!
  }

  extend type Mutation {
    """
    Raise a grievance.

    Deliberately open: someone with a grievance about Duncit may have already
    deleted their account, so requiring one would close the only door they have.
    """
    submitGrievance(input: SubmitGrievanceInput!): GrievanceTicket!
    updateGrievanceStatus(id: ID!, input: UpdateGrievanceStatusInput!): GrievanceTicket!
    saveGrievanceOfficer(input: SaveGrievanceOfficerInput!): GrievanceOfficer!
    "One-time repair: give an id to any grievance that has none."
    backfillGrievanceIds: EntityIdBackfillResult!
  }
`;
