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
    aadhar_number: String!
    pan_number: String!
    passport_photo_url: String!
    police_verification_url: String!
    full_address: String!
    bank_account: BankAccountVerification!
    tags: [String!]!
    host_categories: [HostCategory!]!
    step_completed: Int!
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
    host(host_doc_id: ID!): Host
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
    "Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the host still has live pods."
    deleteHost(host_doc_id: ID!, email: String!, password: String!): Boolean!
  }
`;
