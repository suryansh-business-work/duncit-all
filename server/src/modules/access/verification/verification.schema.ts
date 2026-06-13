export const verificationTypeDefs = /* GraphQL */ `
  enum VerificationType {
    IDENTITY
    ADDRESS
    PHONE
    EMAIL
    BANK_ACCOUNT
    POLICE
    SELFIE
  }

  enum VerificationStatus {
    NOT_SUBMITTED
    PENDING
    APPROVED
    REJECTED
  }

  type Verification {
    type: VerificationType!
    status: VerificationStatus!
    document_url: String
    reject_reason: String
    reviewed_at: String
    updated_at: String
  }

  extend type Query {
    "All 7 verification types for the signed-in user (NOT_SUBMITTED when absent)."
    myVerifications: [Verification!]!
    "A user's verifications — admin review (user details)."
    userVerifications(user_id: ID!): [Verification!]!
  }

  extend type Mutation {
    "Submit/replace a verification document — moves it to PENDING."
    submitVerification(type: VerificationType!, document_url: String!): Verification!
    "Approve or reject a user's verification — admin only."
    reviewVerification(
      user_id: ID!
      type: VerificationType!
      status: VerificationStatus!
      reject_reason: String
    ): Verification!
  }
`;
