import gql from 'graphql-tag';

export const userTypeDefs = gql`
  enum UserStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
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

    dob: String!

    country: String!
    city: String
    zone: String

    roles: [String!]!
    permissions: [String!]!

    assigned_city: String
    assigned_zones: [String!]

    profile_photo: String
    bio: String

    pet_profile: PetProfile

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
    last_name: String!
    email: String!
    phone_number: String!
    phone_extension: String!
    password: String!
    dob: String!
    city: String
    zone: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input GoogleAuthInput {
    id_token: String!
  }

  input UsersFilter {
    role: String
    city: String
    zone: String
    status: UserStatus
    search: String
  }

  extend type Query {
    me: User
    users(filter: UsersFilter): [User!]!
    user(user_id: ID!): User
  }

  type SeedAdminResult {
    created: Boolean!
    emailed: Boolean!
    email: String!
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    loginWithGoogle(input: GoogleAuthInput!): AuthPayload!
    updateMyPetProfile(input: PetProfileInput!): User!
    createUser(input: CreateUserInput!): User!
    updateUser(user_id: ID!, input: UpdateUserInput!): User!
    deleteUser(user_id: ID!): Boolean!
    seedSuperAdmin: SeedAdminResult!

    assignUserRoles(user_id: ID!, role_keys: [String!]!): User!
    addUserRole(user_id: ID!, role_key: String!): User!
    removeUserRole(user_id: ID!, role_key: String!): User!
  }
`;
