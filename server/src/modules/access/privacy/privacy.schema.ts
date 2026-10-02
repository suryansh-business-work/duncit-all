export const privacyTypeDefs = /* GraphQL */ `
  "Where a member answered the tracking-consent question."
  enum TrackingConsentSurface {
    MWEB
    NATIVE
    WEBSITE
  }

  """
  What a member allowed Duncit to store beyond what the service needs.
  Both categories are off until the member turns them on.
  """
  type TrackingConsent {
    "Usage analytics — page views, taps, daily-active pings, Google Analytics."
    analytics: Boolean!
    "Campaign attribution — which link or campaign brought the member here."
    marketing: Boolean!
    "ISO instant of the answer."
    decided_at: String!
  }

  input TrackingConsentInput {
    analytics: Boolean!
    marketing: Boolean!
    surface: TrackingConsentSurface!
  }

  extend type Query {
    "The signed-in member's current tracking choice. Null while they have made none."
    myTrackingConsent: TrackingConsent
    """
    Everything Duncit holds about the signed-in member, as a JSON document
    (GDPR right of access and portability). Credentials are never included.
    """
    myDataExport: String!
  }

  extend type Mutation {
    "Record the signed-in member's tracking choice. Every answer is kept."
    setMyTrackingConsent(input: TrackingConsentInput!): TrackingConsent!
  }
`;
