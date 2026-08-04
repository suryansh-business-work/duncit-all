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
    "BCP-47 language the user picked (e.g. en-IN). Drives every surface."
    locale: String
    profile_links: [ProfileLink!]!

    pet_profile: PetProfile

    saved_pod_ids: [ID!]!
    following_pod_ids: [ID!]!
    following_club_ids: [ID!]!
    following_user_ids: [ID!]!
    "Private profiles this user has asked to follow and is still waiting on."
    requested_user_ids: [ID!]!
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

  input UsersFilter {
    role: String
    city: String
    zone: String
    status: UserStatus
    search: String
  }

  extend type Query {
    users(filter: UsersFilter): [User!]!
    usersTable(query: TableQueryInput): UserTablePage!
    "Admin Partners list — users holding a partner-portal role (Host / Venue Partner / Product Seller / Club Admin)."
    partnersTable(query: TableQueryInput): UserTablePage!
    user(user_id: ID!): User
    userContactActions(user_id: ID!): [UserContactAction!]!
    userContactActionsTable(user_id: ID!, query: TableQueryInput): UserContactActionTablePage!
  }

  extend type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(user_id: ID!, input: UpdateUserInput!): User!
    deleteUser(user_id: ID!): Boolean!
    recordUserContactAction(input: RecordUserContactActionInput!): UserContactAction!
    startRecordedUserCall(input: StartRecordedUserCallInput!): UserContactAction!
    deleteUserContactAction(action_id: ID!): Boolean!
  }
`;
