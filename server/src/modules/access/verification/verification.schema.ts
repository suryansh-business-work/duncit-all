export const verificationTypeDefs = /* GraphQL */ `
  enum VerificationType {
    IDENTITY
    ADDRESS
    EMAIL
  }

  enum VerificationStatus {
    NOT_SUBMITTED
    PENDING
    APPROVED
    REJECTED
    VERIFIED_BY_APP
  }

  type Address {
    line1: String
    line2: String
    city: String
    state: String
    pincode: String
    country: String
  }

  type Verification {
    type: VerificationType!
    status: VerificationStatus!
    document_url: String
    address: Address
    reject_reason: String
    reviewed_at: String
    updated_at: String
  }

  extend type Query {
    "All verification types for the signed-in user (NOT_SUBMITTED when absent)."
    myVerifications: [Verification!]!
    "A user's verifications — admin review (user details)."
    userVerifications(user_id: ID!): [Verification!]!
  }

  extend type Mutation {
    "Submit/replace an IDENTITY document — moves it to PENDING."
    submitVerification(type: VerificationType!, document_url: String!): Verification!
    "Submit a structured address for ADDRESS verification — moves it to PENDING."
    submitAddressVerification(
      line1: String!
      line2: String
      city: String!
      state: String!
      pincode: String!
      country: String
    ): Verification!
    "Approve or reject a user's IDENTITY/ADDRESS verification — admin only."
    reviewVerification(
      user_id: ID!
      type: VerificationType!
      status: VerificationStatus!
      reject_reason: String
    ): Verification!
  }
`;
