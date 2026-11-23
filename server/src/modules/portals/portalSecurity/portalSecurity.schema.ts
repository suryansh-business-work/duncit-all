import gql from 'graphql-tag';

export const portalSecurityTypeDefs = gql`
  "One titled block of the consent wording (security, access, privacy, location notice…). Plain text."
  type PortalSecuritySection {
    key: String!
    title: String!
    paragraphs: [String!]!
  }

  "A link to a full policy published by Legal."
  type PortalSecurityPolicyLink {
    title: String!
    policy_type: String!
    url: String!
  }

  """
  What the server itself sees of this sign-in. The address is read from the
  request through the trusted proxy, never taken from the screen; the place
  derived from it is always approximate.
  """
  type PortalSecurityDetected {
    ip: String
    country: String
    region: String
    city: String
    "Always true: an address maps to a provider's region, not to a person's position."
    ip_location_is_approximate: Boolean!
    browser: String
    os: String
    device_type: String
    user_agent: String
    server_time: String!
  }

  "Where an alternative-verification request stands, as its owner sees it."
  type PortalSecurityExceptionStatus {
    id: ID!
    "PENDING, APPROVED, REJECTED, USED or EXPIRED."
    status: String!
    reason: String!
    decision_note: String
    created_at: String!
    decided_at: String
    "An APPROVED request can be used until this moment."
    expires_at: String
  }

  "Everything the Security Verification screen renders. Only a console sign-in that owes the screen may ask."
  type PortalSecurityChallenge {
    portal_key: String!
    "True when the person verified before and the terms have changed since."
    reverify: Boolean!
    "The version a consent is recorded against — send it back with the consent."
    policy_version: String!
    notice_version: String!
    retention_days: Int!
    user_name: String!
    sections: [PortalSecuritySection!]!
    links: [PortalSecurityPolicyLink!]!
    detected: PortalSecurityDetected!
    exception: PortalSecurityExceptionStatus
  }

  input PortalSecurityConsentInput {
    authorized_person: Boolean!
    credentials_not_shared: Boolean!
    policies_acknowledged: Boolean!
    location_consent: Boolean!
  }

  "A fix from the browser's location API. Accuracy is the radius, in metres, the browser reports."
  input PortalSecurityLocationInput {
    latitude: Float!
    longitude: Float!
    accuracy_meters: Float!
  }

  input PortalSecurityClientInput {
    timezone: String
    language: String
    platform: String
  }

  input PortalSecurityVerificationInput {
    policy_version: String!
    consent: PortalSecurityConsentInput!
    "Required unless exception_id is given."
    location: PortalSecurityLocationInput
    "An APPROVED alternative-verification request, used instead of a location."
    exception_id: ID
    client: PortalSecurityClientInput
  }

  type PortalSecurityVerificationResult {
    "The session token. Replaces the one the sign-in returned, which could not call anything else."
    token: String!
    verified_at: String!
    policy_version: String!
    record_id: ID!
  }

  input PortalSecurityExceptionRequestInput {
    reason: String!
    "PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT or UNSUPPORTED."
    location_error: String
  }

  "A row of the verification log. No address and no coordinates: those are opened one row at a time."
  type PortalSecurityLog {
    id: ID!
    created_at: String!
    signed_in_at: String
    user_id: ID!
    user_name: String!
    user_email: String!
    roles: [String!]!
    portal_key: String!
    "VERIFIED, EXCEPTION_APPROVED or LOCATION_DENIED."
    result: String!
    "GPS or ADMIN_EXCEPTION."
    method: String
    "Whether the HR portal's team structure holds this person, as recorded at the time."
    is_employee: Boolean!
    employee_title: String
    employee_department: String
    employment_type: String
    "The address with its host part hidden, e.g. 103.21.x.x."
    ip_masked: String
    ip_country: String
    ip_region: String
    ip_city: String
    has_location: Boolean!
    accuracy_m: Float
    browser: String
    os: String
    device_type: String
    policy_version: String!
  }

  type PortalSecurityLogPage {
    rows: [PortalSecurityLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type PortalSecurityConsentRecord {
    authorized_person: Boolean!
    credentials_not_shared: Boolean!
    policies_acknowledged: Boolean!
    location_consent: Boolean!
  }

  type PortalSecurityAccessEntry {
    id: ID!
    actor_name: String!
    "LIST or VIEW."
    action: String!
    created_at: String!
  }

  type PortalSecurityExceptionSummary {
    id: ID!
    status: String!
    reason: String!
    decided_by_name: String
    decided_at: String
    decision_note: String
  }

  "One verification opened in full. Reading it is recorded in access_history."
  type PortalSecurityLogDetail {
    id: ID!
    created_at: String!
    signed_in_at: String
    user_id: ID!
    user_name: String!
    user_email: String!
    roles: [String!]!
    portal_key: String!
    result: String!
    method: String
    is_employee: Boolean!
    employee_title: String
    employee_department: String
    employment_type: String
    "Today's answer from the HR portal, beside the one recorded at the time."
    current_is_employee: Boolean!
    current_employee_title: String
    ip: String
    ip_masked: String
    ip_country: String
    ip_region: String
    ip_city: String
    "Always true: the place above is derived from the address, never a GPS fix."
    ip_location_is_approximate: Boolean!
    has_location: Boolean!
    latitude: Float
    longitude: Float
    accuracy_m: Float
    location_error: String
    browser: String
    os: String
    device_type: String
    user_agent: String
    duid: String
    timezone: String
    language: String
    platform: String
    policy_version: String!
    notice_version: String!
    consent: PortalSecurityConsentRecord!
    exception: PortalSecurityExceptionSummary
    "This person's other verifications, newest first."
    related: [PortalSecurityLog!]!
    "Who has opened this record."
    access_history: [PortalSecurityAccessEntry!]!
  }

  type PortalSecurityException {
    id: ID!
    user_id: ID!
    user_name: String!
    portal_key: String!
    reason: String!
    location_error: String
    status: String!
    decided_by_name: String
    decided_at: String
    decision_note: String
    expires_at: String
    used_at: String
    created_at: String!
  }

  type PortalSecurityExceptionPage {
    rows: [PortalSecurityException!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input PortalSecurityExceptionDecisionInput {
    id: ID!
    approve: Boolean!
    note: String
  }

  extend type Query {
    "The Security Verification screen's content. Console sign-ins that owe the screen only."
    portalSecurityChallenge: PortalSecurityChallenge!
    "Where this person's alternative-verification request stands, if they made one."
    portalSecurityException: PortalSecurityExceptionStatus
    "The verification log (Tech > Security > Login verifications). SUPER_ADMIN and TECH_MANAGER only."
    portalSecurityLogsTable(query: TableQueryInput): PortalSecurityLogPage!
    "One verification in full, with the address and coordinates. Opening it is logged."
    portalSecurityLog(id: ID!): PortalSecurityLogDetail!
    "Alternative-verification requests, newest first. SUPER_ADMIN and TECH_MANAGER only."
    portalSecurityExceptionsTable(query: TableQueryInput): PortalSecurityExceptionPage!
  }

  extend type Mutation {
    "Complete the screen: record the consent and location, and swap the sign-in token for a session."
    submitPortalSecurityVerification(input: PortalSecurityVerificationInput!): PortalSecurityVerificationResult!
    "Declined or could not share a location: ask an administrator for another way. Recorded."
    requestPortalSecurityException(input: PortalSecurityExceptionRequestInput!): PortalSecurityExceptionStatus!
    "Approve or reject an alternative-verification request. Cannot be your own."
    decidePortalSecurityException(input: PortalSecurityExceptionDecisionInput!): PortalSecurityException!
  }
`;
