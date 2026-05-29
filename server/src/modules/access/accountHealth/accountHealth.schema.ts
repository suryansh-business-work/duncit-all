export const accountHealthTypeDefs = /* GraphQL */ `
  enum HealthSubjectType {
    USER
    VENUE
  }

  enum HealthBand {
    RED
    YELLOW
    GREEN
  }

  type HealthAdjustment {
    id: ID!
    delta: Int!
    remark: String!
    created_by_id: ID
    created_by_name: String!
    created_at: String!
  }

  type HealthScore {
    subject_type: HealthSubjectType!
    subject_id: ID!
    subject_label: String!
    base_score: Int!
    delta_sum: Int!
    total_score: Int!
    band: HealthBand!
    adjustments: [HealthAdjustment!]!
  }

  input AdjustHealthInput {
    subject_type: HealthSubjectType!
    subject_id: ID!
    delta: Int!
    remark: String!
  }

  extend type Query {
    """ Account health for the signed-in user. Always returns a record (default base = 100). """
    myAccountHealth: HealthScore!
    """ Venue health for a venue owned by the signed-in user. """
    myVenueHealth(venue_id: ID!): HealthScore
    """ Admin-only: account health for any user. """
    userAccountHealth(user_id: ID!): HealthScore!
    """ Admin-only: health for a specific venue. """
    venueHealth(venue_id: ID!): HealthScore
  }

  extend type Mutation {
    """ Admin-only: append a delta with remark. Returns the updated score. """
    adjustHealth(input: AdjustHealthInput!): HealthScore!
  }
`;
