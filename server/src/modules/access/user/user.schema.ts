import gql from 'graphql-tag';

export const userTypeDefs = gql`
  enum UserStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
  }

  enum AuthProvider {
    EMAIL
    GOOGLE
  }

  enum ProfileVisibility {
    PUBLIC
    PRIVATE
  }

  enum AdminContactActionType {
    CALL
    EMAIL
  }

  type ProfileLink {
    label: String!
    url: String!
  }

  input ProfileLinkInput {
    label: String!
    url: String!
  }

  "A structured postal address — the user's saved main address / order billing address."
  type PostalAddress {
    line1: String!
    line2: String!
    landmark: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
  }

  input PostalAddressInput {
    line1: String
    line2: String
    landmark: String
    city: String
    state: String
    pincode: String
    country: String
  }

  type User {
    user_id: ID!
    first_name: String!
    last_name: String!
    full_name: String

    email: String
    is_email_verified: Boolean

    phone_number: String!
    phone_extension: String!
    is_phone_verified: Boolean

    auth_providers: [AuthProvider!]!
    last_login_provider: AuthProvider
    last_login_at: String

    dob: String!

    country: String!
    city: String
    state: String
    pincode: String
    zone: String
    "The saved main postal address (prefills checkout billing)."
    address: PostalAddress!
    "The location the user last selected in the header (persisted choice)."
    selected_location_id: ID

    roles: [String!]!

    assigned_city: String
    assigned_zones: [String!]

    profile_photo: String
    bio: String
    profile_links: [ProfileLink!]!

    pet_profile: PetProfile

    saved_pod_ids: [ID!]!
    following_pod_ids: [ID!]!
    following_club_ids: [ID!]!
    following_user_ids: [ID!]!
    followers_count: Int!
    following_count: Int!
    interest_category_ids: [ID!]!
    interest_categories: [Category!]!
    onboarding_survey_completed: Boolean!

    whatsapp_extension: String
    whatsapp_number: String
    whatsapp_verified_at: String

    is_first_time_user: Boolean!

    status: UserStatus
    profile_visibility: ProfileVisibility

    # Host deduction overrides (two %s): the host's share of the pod net, and
    # the commission Duncit takes from that share. Set from Admin → user details.
    host_share_pct: Float!
    host_commission_pct: Float!

    created_at: String
    updated_at: String
  }

  type PetProfile {
    name: String
    species: String
    breed: String
    age: Int
    photo_url: String
    bio: String
  }

  input PetProfileInput {
    name: String
    species: String
    breed: String
    age: Int
    photo_url: String
    bio: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type UserContactAction {
    id: ID!
    user_id: ID!
    created_by: ID
    type: AdminContactActionType!
    target: String!
    subject: String!
    notes: String!
    status: String!
    duration_seconds: Int!
    twilio_call_sid: String!
    recording_sid: String!
    recording_url: String!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (usersTable)."
  type UserTablePage {
    rows: [User!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page for the shared table engine (userContactActionsTable)."
  type UserContactActionTablePage {
    rows: [UserContactAction!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateUserInput {
    first_name: String!
    last_name: String!
    email: String
    phone_number: String!
    phone_extension: String!
    password: String!
    dob: String!
    roles: [String!]!
    city: String
    zone: String
    assigned_city: String
    assigned_zones: [String!]
  }

  input UpdateUserInput {
    first_name: String
    last_name: String
    email: String
    phone_number: String
    phone_extension: String
    dob: String
    city: String
    state: String
    pincode: String
    zone: String
    bio: String
    profile_photo: String
    status: UserStatus
    roles: [String!]
    assigned_city: String
    assigned_zones: [String!]
    host_share_pct: Float
    host_commission_pct: Float
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

  input RecordUserContactActionInput {
    user_id: ID!
    type: AdminContactActionType!
    target: String!
    subject: String
    notes: String
    status: String
    duration_seconds: Int
    recording_url: String
  }

  input StartRecordedUserCallInput {
    user_id: ID!
    target: String!
    notes: String
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

  input UpdateMyProfileInput {
    first_name: String
    last_name: String
    bio: String
    profile_photo: String
    profile_links: [ProfileLinkInput!]
    city: String
    state: String
    zone: String
    country: String
    dob: String
    phone_number: String
    phone_extension: String
    whatsapp_number: String
    whatsapp_extension: String
    "The user's saved main postal address."
    address: PostalAddressInput
  }

  type SavedPodState {
    pod_id: ID!
    saved: Boolean!
    saved_pod_ids: [ID!]!
  }

  input UsersFilter {
    role: String
    city: String
    zone: String
    status: UserStatus
    search: String
  }

  type PublicProfile {
    user_id: ID!
    "Derived @handle (no real username field exists yet) for the follow lists."
    username: String!
    full_name: String
    first_name: String
    last_name: String
    profile_photo: String
    bio: String
    city: String
    zone: String
    followers_count: Int!
    following_count: Int!
    "PRIVATE when this profile hides its posts/stories from non-followers."
    is_private: Boolean!
    "Whether the signed-in viewer follows this user."
    is_following: Boolean!
    "True when the viewer may see this user's posts/stories (owner, public, or follower)."
    can_view_content: Boolean!
  }

  """
  Sort order for the viewer's saved pods. RECENT = most recently saved first.
  """
  enum SavedPodSort {
    RECENT
    DATE_ASC
    DATE_DESC
    PRICE_LOW
    PRICE_HIGH
    NAME_ASC
    NAME_DESC
  }

  extend type Query {
    me: User
    "The viewer's saved pods, with optional server-side search, category filter (matches the selected category and its sub-categories) and sort."
    mySavedPods(search: String, category_id: ID, sort: SavedPodSort): [Pod!]!
    users(filter: UsersFilter): [User!]!
    usersTable(query: TableQueryInput): UserTablePage!
    "Admin Partners list — users holding a partner-portal role (Host / Venue Partner / Product Seller / Club Admin)."
    partnersTable(query: TableQueryInput): UserTablePage!
    user(user_id: ID!): User
    userContactActions(user_id: ID!): [UserContactAction!]!
    userContactActionsTable(user_id: ID!, query: TableQueryInput): UserContactActionTablePage!
    publicUsersByIds(user_ids: [ID!]!): [PublicProfile!]!
    publicUserProfile(user_id: ID!): PublicProfile
    "People who follow the given user (their public profiles)."
    followersOf(user_id: ID!): [PublicProfile!]!
    "People the given user follows (their public profiles)."
    followingOf(user_id: ID!): [PublicProfile!]!
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
    updateMyProfile(input: UpdateMyProfileInput!): User!
    updateMyProfileVisibility(visibility: ProfileVisibility!): User!
    "Persist the user's selected header location (pass null to clear)."
    setMySelectedLocation(location_id: ID): User!
    requestEmailVerificationOtp: OtpRequestResult!
    verifyEmailVerificationOtp(otp: String!): User!
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
    updateMyPetProfile(input: PetProfileInput!): User!
    updateMyInterests(category_ids: [ID!]!): User!
    toggleSavedPod(pod_doc_id: ID!): SavedPodState!
    followPod(pod_id: ID!): User!
    unfollowPod(pod_id: ID!): User!
    followClub(club_id: ID!): User!
    unfollowClub(club_id: ID!): User!
    followUser(user_id: ID!): User!
    unfollowUser(user_id: ID!): User!
    createUser(input: CreateUserInput!): User!
    updateUser(user_id: ID!, input: UpdateUserInput!): User!
    deleteUser(user_id: ID!): Boolean!
    seedSuperAdmin: SeedAdminResult!

    assignUserRoles(user_id: ID!, role_keys: [String!]!): User!
    addUserRole(user_id: ID!, role_key: String!): User!
    removeUserRole(user_id: ID!, role_key: String!): User!
    grantAdminAccess(user_id: ID!): User!
    revokeAdminAccess(user_id: ID!): User!
    recordUserContactAction(input: RecordUserContactActionInput!): UserContactAction!
    startRecordedUserCall(input: StartRecordedUserCallInput!): UserContactAction!
    deleteUserContactAction(action_id: ID!): Boolean!
  }
`;
