export const hostTypeDefs = /* GraphQL */ `
  enum HostStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
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
    step_completed: Int!
    status: HostStatus!
    reviewer_notes: String!
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
  }

  extend type Query {
    myHost: Host
    hosts(status: HostStatus): [Host!]!
    host(host_doc_id: ID!): Host
  }

  extend type Mutation {
    submitHostStep1(input: HostStep1Input!): Host!
    submitHostStep2(input: HostStep2Input!): Host!
    submitHostStep3(input: HostStep3Input!): Host!
    submitHostFinal: Host!
    approveHost(host_doc_id: ID!, notes: String): Host!
    rejectHost(host_doc_id: ID!, notes: String!): Host!
    adminCreateHost(
      target_user_id: ID!
      step1: HostStep1Input!
      step2: HostStep2Input!
      step3: HostStep3Input!
      submit: Boolean
    ): Host!
  }
`;
