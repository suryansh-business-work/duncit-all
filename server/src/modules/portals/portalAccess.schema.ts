import gql from 'graphql-tag';

export const portalAccessTypeDefs = gql`
  "One staff console in the Jump to Portal directory, with the signed-in user's standing."
  type PortalAccessEntry {
    key: String!
    name: String!
    url: String!
    "Whether the signed-in user's roles open this console today."
    has_access: Boolean!
    "False where access is not granted through this flow (the Admin console, ungated surfaces)."
    can_request: Boolean!
    "The user's latest PORTAL_ACCESS request outcome for this console, if any."
    request_status: ApprovalStatus
  }

  extend type Query {
    "Every staff console with whether the signed-in user can open it (Jump to Portal)."
    myPortalAccess: [PortalAccessEntry!]!
  }

  extend type Mutation {
    "Ask an admin for console access — lands in Admin > Portal Access; the decision is emailed."
    requestPortalAccess(portal_key: String!): PortalAccessEntry!
  }
`;
