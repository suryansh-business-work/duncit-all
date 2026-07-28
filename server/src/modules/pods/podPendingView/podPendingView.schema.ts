export const podPendingViewTypeDefs = /* GraphQL */ `
  """
  Venue contact card for the host's post-create waiting screen. Carries PII, so
  it is only ever served through hostPodPendingView (pod hosts / co-hosts).
  """
  type HostPodPendingVenue {
    venue_id: ID!
    venue_name: String!
    """
    The venue owner — the person who decides the slot request. Null when the
    venue has no owner name on file.
    """
    contact_person: String
    """
    Dialable number as stored on the venue (no extension is collected for it).
    """
    phone: String
    email: String
    """
    Single-line postal address (line1, line2, locality, city, state, pincode,
    country — blanks skipped). Null when the venue has no address on file.
    """
    address: String
    "Latitude for the 'View on Map' link. Null when the venue is not geocoded."
    lat: Float
    lng: Float
  }

  """
  Club-admin contact card ("Need help?"). Carries PII, so it is only ever
  served through hostPodPendingView (pod hosts / co-hosts).
  """
  type HostPodPendingClubAdmin {
    user_id: ID!
    name: String!
    profile_photo: String
    """
    Dialable number with its extension when stored (e.g. "+91 9876543210").
    """
    phone: String
    """
    WhatsApp number with its extension — the client strips non-digits to build
    the wa.me link. Null when the admin has no WhatsApp number on file.
    """
    whatsapp: String
    email: String
  }

  """
  Everything the post-create waiting screen renders. The venue's decision is
  pod.venue_approval_status — the query works at ANY approval status so the
  screen can poll and flip once the venue approves or declines.
  """
  type HostPodPendingView {
    "The pod itself, in the same public shape as the pod query."
    pod: Pod!
    "The pod's club category name (empty when the club has none)."
    category_name: String!
    """
    Projected host payout for this pod — the earnings waterfall's
    host_receives, billed on payable spots (total - 1, host's seat is free).
    """
    expected_earnings: Float!
    currency_symbol: String!
    "Null for virtual pods and location-only pods (no venue attached)."
    venue: HostPodPendingVenue
    "The club's first assigned admin. Null when the club has none."
    club_admin: HostPodPendingClubAdmin
  }

  extend type Query {
    """
    Host-only view backing the waiting screen shown after creating a pod whose
    venue slot request is PENDING. Only the pod's hosts and its non-declined
    co-hosts may read it — venue/admin contact details are PII.
    """
    hostPodPendingView(pod_doc_id: ID!): HostPodPendingView!
  }
`;
