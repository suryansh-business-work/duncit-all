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

  input PortalLoginOtpRequestInput {
    email: String!
    "The console being signed in to. The code only works for this one."
    portal_key: String
  }

  input PortalLoginOtpInput {
    email: String!
    otp: String!
    portal_key: String
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    """
    Email a sign-in code for a console.

    Answers the same way whatever happens, on purpose: an account that does not
    exist, one that is not active and one with no role for this portal are all
    reported as sent. Told apart, this mutation would be a directory of who
    works here and what they can reach.
    """
    requestPortalLoginOtp(input: PortalLoginOtpRequestInput!): OtpRequestResult!
    "Trade a correct code for the same session a password would have produced."
    loginWithPortalOtp(input: PortalLoginOtpInput!): AuthPayload!
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
