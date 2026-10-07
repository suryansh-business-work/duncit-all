export const hostTypeDefs = /* GraphQL */ `
  enum HostStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
  }

  type HostCategory {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String!
    category_name: String!
    sub_category_name: String!
    request_no: String!
  }

  type Host {
    id: ID!
    user_id: ID!
    full_name: String!
    email: String!
    phone: String!
    dob: String
    "Host Settings: Pod Requests this host may send to venues per month."
    max_venue_requests_per_month: Int!
    "Admin cap that wins over the host's own setting; null = not set."
    venue_requests_limit_override: Int
    aadhar_number: String!
    pan_number: String!
    passport_photo_url: String!
    police_verification_url: String!
    full_address: String!
    bank_account: BankAccountVerification!
    tags: [String!]!
    host_categories: [HostCategory!]!
    """
    The Super → Category → Sub this applicant picked in their "Earn with
    Duncit" onboarding survey, read back from their onboarding meeting.
    Resolved on demand (never selected by the list queries) so the Review Host
    dialog can prefill the picker even when the pick was never copied onto
    host_categories — meetings approved before that seeding existed, partial
    triples, and hosts onboarded outside the meeting flow all leave it empty.
    Null when they never booked a meeting or the taxonomy has since changed.
    """
    survey_category: HostCategory
    """
    Phone, DOB and address from the host's own user account. Resolved on demand
    for the Edit Host dialog, which fills the host fields still blank from it:
    hosts drafted from an approved meeting carry only a name, email and phone.
    Null for anyone without hosts-console read access (it is personal data).
    """
    account_profile: HostAccountProfile
    step_completed: Int!
    "Permanent human id (HOST-000001) — Onboarded Hosts table."
    host_no: String
    status: HostStatus!
    is_active: Boolean!
    reviewer_notes: String!
    # Duncit commission % override on this host's payouts (0 = inherit the
    # global default). Only populated on the admin/onboarding queries — null
    # on publicHosts.
    host_commission_pct: Float
    submitted_at: String
    approved_at: String
    rejected_at: String
    created_at: String!
    updated_at: String!
  }

  "The account-side copy of a host's personal details (see Host.account_profile)."
  type HostAccountProfile {
    phone: String!
    dob: String
    full_address: String!
  }

  "Server-side table page for the shared table engine (hostsTable)."
  type HostTablePage {
    rows: [Host!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input HostStep1Input {
    full_name: String!
    email: String!
    phone: String!
    dob: String
  }

  input HostStep2Input {
    aadhar_number: String!
    pan_number: String!
    passport_photo_url: String!
  }

  input HostStep3Input {
    police_verification_url: String!
    full_address: String!
    bank_account: BankAccountVerificationInput
    tags: [String!]
  }

  "A Super → Category → Sub triple a host is approved to operate in."
  input HostCategoryInput {
    super_category_id: ID!
    category_id: ID!
    sub_category_id: ID!
  }

  extend type Query {
    myHost: Host
    hosts(status: HostStatus): [Host!]!
    "Admin/onboarding table page over all hosts (shared table engine)."
    hostsTable(query: TableQueryInput): HostTablePage!
    host(host_doc_id: ID!): Host
    "The host profile behind a user, or null when they have never onboarded."
    hostByUser(user_id: ID!): Host
    publicHosts: [Host!]!
  }

  extend type Mutation {
    submitHostStep1(input: HostStep1Input!): Host!
    submitHostStep2(input: HostStep2Input!): Host!
    submitHostStep3(input: HostStep3Input!): Host!
    submitHostFinal: Host!
    withdrawHostApplication: Host!
    approveHost(host_doc_id: ID!, notes: String, tags: [String!]): Host!
    rejectHost(host_doc_id: ID!, notes: String!): Host!
    adminCreateHost(
      target_user_id: ID!
      step1: HostStep1Input!
      step2: HostStep2Input!
      step3: HostStep3Input!
      submit: Boolean
    ): Host!
    """
    Replace a host's operating categories and nothing else. adminUpdateHost
    requires the whole step1/2/3 payload, so a caller that only wants to set
    categories would have to round-trip every other field to use it.
    """
    adminSetHostCategories(host_doc_id: ID!, categories: [HostCategoryInput!]!): Host!
    adminUpdateHost(
      host_doc_id: ID!
      step1: HostStep1Input!
      step2: HostStep2Input!
      step3: HostStep3Input!
      status: HostStatus
      "When provided, replaces the host's operating categories (multi-category)."
      categories: [HostCategoryInput!]
    ): Host!
    setHostActive(host_doc_id: ID!, active: Boolean!): Host!
    "Host Settings: the signed-in host's own monthly cap on Pod Requests to venues (0-100)."
    setMyVenueRequestLimit(limit: Int!): Host!
    "Admin override for a host's monthly Pod Requests to venues (null clears it)."
    setHostVenueRequestLimit(host_doc_id: ID!, limit: Int): Host!
    "Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the host still has live pods."
    deleteHost(host_doc_id: ID!, email: String!, password: String!): Boolean!
  }
`;
