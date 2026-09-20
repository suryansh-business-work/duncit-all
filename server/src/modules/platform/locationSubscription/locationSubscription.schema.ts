export const locationSubscriptionTypeDefs = /* GraphQL */ `
  "A city's launch waitlist, as the app's subscribe page reads it."
  type LocationLaunchStatus {
    location: Location!
    subscriber_count: Int!
    launch_target: Int!
    "Whether the signed-in viewer has already added their name; false when signed out."
    is_subscribed: Boolean!
    "The backdrops the page plays: the city's own where it set one, else the global set from Branding."
    launch_media: LaunchPageMedia!
  }

  "Where one subscriber's launch message stands."
  enum LocationSubscriptionStatus {
    "Not messaged yet."
    PENDING
    SENT
    "Not sent on purpose, e.g. the number opted out of marketing or is invalid."
    SKIPPED
    "The send was attempted and failed; the next Send retries it."
    FAILED
  }

  "A member who asked to be told when a not-yet-launched city launches."
  type LocationSubscription {
    id: ID!
    location_doc_id: ID!
    city: String!
    user_id: ID!
    name: String!
    "Country code + number, digits only, as the launch message is sent to."
    whatsapp: String!
    "Whether the member agreed to share their current location when they added their name."
    location_shared: Boolean!
    status: LocationSubscriptionStatus!
    "Why a send was skipped or failed; empty otherwise."
    reason: String!
    notified_at: String
    created_at: String!
  }

  type LocationSubscriptionTablePage {
    rows: [LocationSubscription!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One city's waitlist totals (Admin > Subscribe for location)."
  type LocationSubscriptionCity {
    location: Location!
    subscriber_count: Int!
    notified_count: Int!
    "Everyone not yet SENT — who the next Send reaches."
    pending_count: Int!
  }

  type LocationLaunchSendResult {
    "How many subscribers the send was started for; it runs in the background."
    queued: Int!
  }

  extend type Query {
    "Public. Takes the city's id or its slug (Location.location_id, e.g. agra) — the form a shared link carries. Null when the city does not exist."
    locationLaunchStatus(location_doc_id: ID!): LocationLaunchStatus
    "Admin: every subscriber, filterable by location_doc_id."
    locationSubscriptionsTable(query: TableQueryInput): LocationSubscriptionTablePage!
    "Admin: one row per city that has at least one subscriber."
    locationSubscriptionCities: [LocationSubscriptionCity!]!
  }

  extend type Mutation {
    "Signed in. Adds the viewer to a not-yet-launched city's waitlist (by id or slug); repeat taps are no-ops. location_shared records the answer to the app's share-your-location question."
    subscribeLocationLaunch(location_doc_id: ID!, location_shared: Boolean = false): LocationLaunchStatus!
    "Admin. Sends the WhatsApp launch message to the city's subscribers who are not SENT yet. The city must be launched."
    sendLocationLaunchMessage(location_doc_id: ID!): LocationLaunchSendResult!
  }
`;
