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
    """
    The account's phone number — digits only, without the dial code.

    Required and unique: it is the second way an account is identified, so a
    number already registered fails the signup instead of creating a second
    person behind the same phone. Google signup collects it later; this door
    asks for it up front.
    """
    phone_number: String!
    "The dial code the number belongs to, such as +91. Chosen from a list."
    phone_extension: String!
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

  "Where a forgotten-password code is sent."
  enum PasswordResetChannel {
    EMAIL
    "WhatsApp, on the number the account signed up with or added later."
    PHONE
  }

  """
  Which account is recovering, and where its code should go.

  The fields the chosen channel does not use are ignored rather than required —
  one input rather than two mutations, because everything after this step is the
  same either way.
  """
  input PasswordResetLookupInput {
    channel: PasswordResetChannel!
    "EMAIL only."
    email: String
    "PHONE only — the dial code, e.g. +91."
    phone_extension: String
    "PHONE only — digits, without the dial code."
    phone_number: String
  }

  input VerifyPasswordResetCodeInput {
    channel: PasswordResetChannel!
    email: String
    phone_extension: String
    phone_number: String
    otp: String!
  }

  input CompletePasswordResetInput {
    "The one-shot grant verifyPasswordResetCode handed back."
    reset_token: String!
    new_password: String!
  }

  type PasswordResetRequestResult {
    ok: Boolean!
    """
    False when there is no account with these details, or the account signs in
    with Google and has no password to reset. No code is sent in either case.
    """
    registered: Boolean!
    channel: PasswordResetChannel!
    "ISO instant the code stops working. Null when nothing was sent."
    expires_at: String
    "Seconds to wait before another code can be asked for."
    resend_after_seconds: Int!
    "How long the code lasts, so no screen hard-codes the rule."
    expires_in_minutes: Int!
    """
    The code itself, echoed back ONLY while no medium could really carry it.
    Null the moment a real transport handles the send.
    """
    test_code: String
  }

  type PasswordResetVerifyResult {
    ok: Boolean!
    """
    A single-use grant, valid for what is left of the code's own life. It is
    what the last step spends — the code is never sent again.
    """
    reset_token: String!
  }

  input RequestPasswordChangeInput {
    current_password: String!
  }

  input ChangePasswordInput {
    otp: String!
    new_password: String!
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
    """
    Step one of forgotten-password recovery: send a code to the chosen channel.

    Replaces requestPasswordResetOtp, which is email-only and stays for app
    builds already on people's phones.
    """
    requestPasswordResetCode(input: PasswordResetLookupInput!): PasswordResetRequestResult!
    """
    Step two: prove the code and get the grant that sets the password.

    Its own step so a wrong code is reported before anybody types a new password
    twice. The code is single-use, expires with the challenge, and a wrong one
    costs an attempt.
    """
    verifyPasswordResetCode(input: VerifyPasswordResetCodeInput!): PasswordResetVerifyResult!
    """
    Step three: spend the grant and set the new password.

    Refuses a password the account already holds, and ends every session opened
    before it — the flow exists because somebody else may hold the old one.
    """
    completePasswordReset(input: CompletePasswordResetInput!): Boolean!
    "Deprecated: email-only step one. Use requestPasswordResetCode."
    requestPasswordResetOtp(email: String!): OtpRequestResult!
    "Deprecated: code + new password in one call. Use completePasswordReset."
    resetPasswordWithOtp(input: ResetPasswordInput!): Boolean!
    "Auth-required: verify the current password and email a change-confirmation OTP."
    requestPasswordChangeOtp(input: RequestPasswordChangeInput!): OtpRequestResult!
    "Auth-required: confirm the OTP and set the new password."
    changePasswordWithOtp(input: ChangePasswordInput!): Boolean!
    """
    Auth-required: email a confirmation code before asking to be deleted.

    The code is spent by submitAccountDeletionRequest, which FILES a request
    for the Tech portal rather than deleting anything — see the accountDeletion
    module. Nothing in this module deletes an account any more.
    """
    requestAccountDeletionOtp: OtpRequestResult!
    seedSuperAdmin: SeedAdminResult!
  }
`;
