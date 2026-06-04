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
    zone: String

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
    zone: String
    bio: String
    profile_photo: String
    status: UserStatus
    roles: [String!]
    assigned_city: String
    assigned_zones: [String!]
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
    zone: String
    country: String
    dob: String
    phone_number: String
    phone_extension: String
    whatsapp_number: String
    whatsapp_extension: String
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
    full_name: String
    first_name: String
    last_name: String
    profile_photo: String
    bio: String
    city: String
    zone: String
  }

  extend type Query {
    me: User
    mySavedPods: [Pod!]!
    users(filter: UsersFilter): [User!]!
    user(user_id: ID!): User
    userContactActions(user_id: ID!): [UserContactAction!]!
    publicUsersByIds(user_ids: [ID!]!): [PublicProfile!]!
    publicUserProfile(user_id: ID!): PublicProfile
  }

  type SeedAdminResult {
    created: Boolean!
    emailed: Boolean!
    email: String!
  }

  type OtpRequestResult {
    ok: Boolean!
    dev_otp: String
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    loginWithGoogle(input: GoogleAuthInput!): AuthPayload!
    signupWithGoogle(input: GoogleSignupInput!): AuthPayload!
    updateMyProfile(input: UpdateMyProfileInput!): User!
    requestEmailVerificationOtp: OtpRequestResult!
    verifyEmailVerificationOtp(otp: String!): User!
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
    recordUserContactAction(input: RecordUserContactActionInput!): UserContactAction!
    startRecordedUserCall(input: StartRecordedUserCallInput!): UserContactAction!
    deleteUserContactAction(action_id: ID!): Boolean!
  }
`;
