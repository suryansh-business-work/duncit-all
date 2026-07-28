import gql from 'graphql-tag';

export const profileTypeDefs = gql`
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
    publicUsersByIds(user_ids: [ID!]!): [PublicProfile!]!
    publicUserProfile(user_id: ID!): PublicProfile
    "People who follow the given user (their public profiles)."
    followersOf(user_id: ID!): [PublicProfile!]!
    "People the given user follows (their public profiles)."
    followingOf(user_id: ID!): [PublicProfile!]!
  }

  extend type Mutation {
    updateMyProfile(input: UpdateMyProfileInput!): User!
    updateMyProfileVisibility(visibility: ProfileVisibility!): User!
    "Persist the user's selected header location (pass null to clear)."
    setMySelectedLocation(location_id: ID): User!
    "Persist the signed-in users language. Validated against active locales."
    setMyLocale(locale: String!): User!
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
  }
`;
