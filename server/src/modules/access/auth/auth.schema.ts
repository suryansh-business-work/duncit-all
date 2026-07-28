import gql from 'graphql-tag';

export const authTypeDefs = gql`
  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    first_name: String!
    last_name: String
    email: String!
    phone_number: String
    phone_extension: String
    password: String!
    dob: String!
    city: String
    zone: String
  }

  input LoginInput {
    email: String!
    password: String!
    portal_key: String
  }

  input ResetPasswordInput {
    email: String!
    otp: String!
    new_password: String!
  }

  input RequestPasswordChangeInput {
    current_password: String!
  }

  input ChangePasswordInput {
    otp: String!
    new_password: String!
  }

  input DeleteMyAccountInput {
    otp: String!
  }

  input GoogleAuthInput {
    id_token: String!
    portal_key: String
  }

  input GoogleSignupInput {
    id_token: String!
    phone_number: String
    phone_extension: String
    dob: String
    city: String
    zone: String
  }

  type SeedAdminResult {
    created: Boolean!
    emailed: Boolean!
    email: String!
  }

  type OtpRequestResult {
    ok: Boolean!
    dev_otp: String
    "Password-reset only: false when the email is not a registered account (no OTP is sent)."
    registered: Boolean
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    loginWithGoogle(input: GoogleAuthInput!): AuthPayload!
    signupWithGoogle(input: GoogleSignupInput!): AuthPayload!
    requestPasswordResetOtp(email: String!): OtpRequestResult!
    resetPasswordWithOtp(input: ResetPasswordInput!): Boolean!
    "Auth-required: verify the current password and email a change-confirmation OTP."
    requestPasswordChangeOtp(input: RequestPasswordChangeInput!): OtpRequestResult!
    "Auth-required: confirm the OTP and set the new password."
    changePasswordWithOtp(input: ChangePasswordInput!): Boolean!
    "Auth-required: email a confirmation OTP before self-serve account deletion."
    requestAccountDeletionOtp: OtpRequestResult!
    "Auth-required: confirm the OTP and soft-delete (and anonymize) the account."
    deleteMyAccount(input: DeleteMyAccountInput!): Boolean!
    seedSuperAdmin: SeedAdminResult!
  }
`;
