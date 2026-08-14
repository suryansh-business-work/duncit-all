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
    """
    A friend's referral code. Optional, and checked before the account is
    created: a code that does not exist fails the signup rather than quietly
    costing both sides their coins.
    """
    referral_code: String
    """
    Every policy the person ticked in the acceptance dialog.

    Re-verified server-side against \`signupPolicies\` before the account is
    created — the tick boxes shape the form, they cannot stop a hand-rolled
    mutation. A list that does not cover the required set fails the signup.
    """
    accepted_policy_ids: [ID!]
    "Which app they accepted in. Recorded on every acceptance row."
    accepted_policy_surface: PolicyAcceptanceSurface = UNKNOWN
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
    """
    Every policy the person ticked in the acceptance dialog.

    This mutation is new-account-only, so the SAME dialog runs after Google
    returns its id_token and the mutation is only called once everything is
    accepted — no second route, no post-signup screen. Re-verified here too.
    """
    accepted_policy_ids: [ID!]
    "Which app they accepted in. Recorded on every acceptance row."
    accepted_policy_surface: PolicyAcceptanceSurface = UNKNOWN
  }

  "The Google account currently linked to a Duncit account."
  type ConnectedGoogleAccount {
    "The Gmail address the user is prompted with. Falls back to the account email for accounts created by Google signup, which predate the stored field."
    google_email: String!
    "ISO timestamp of when the link was granted. Null for Google-signup accounts linked before this was recorded."
    linked_at: String
  }

  """
  What a user can currently sign in with.

  has_password is what makes Google safe to disconnect: an account with no
  password has Google as its ONLY way in, so unlinking would lock the user out.
  """
  type ConnectedAccounts {
    email: String
    has_password: Boolean!
    google: ConnectedGoogleAccount
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

  extend type Query {
    """
    Auth-required: what the signed-in account can sign in with.

    Reads the password hash's PRESENCE (it is select:false, so the generic
    user mapper cannot see it) which is why this is its own query rather than a
    field on User.
    """
    myConnectedAccounts: ConnectedAccounts!
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
    """
    Grant Google sign-in to an existing email/password account, then sign in.

    This is the "allow" half of the consent step loginWithGoogle triggers with
    EMAIL_LOGIN_REQUIRED. Deliberately UNAUTHENTICATED: the caller has just
    proved control of the Google account, and verifyGoogleIdToken refuses a
    token whose email Google has not verified — so a verified address matching
    an account IS the proof. The password is never touched; the account keeps
    both ways in.
    """
    linkGoogleAccount(input: GoogleAuthInput!): AuthPayload!
    signupWithGoogle(input: GoogleSignupInput!): AuthPayload!
    "Auth-required: link a Google account from Profile > Connected Accounts."
    connectGoogleAccount(input: GoogleAuthInput!): ConnectedAccounts!
    """
    Auth-required: unlink the Google account.

    Refused when the account has no password — Google would be the only way in,
    and unlinking it would lock the user out of their own account.
    """
    disconnectGoogleAccount: ConnectedAccounts!
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
