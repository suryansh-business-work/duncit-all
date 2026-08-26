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

  """
  Why a typed handle was refused. Codes rather than sentences: the client owns
  the copy (rule 38), and this is answered on every keystroke.
  """
  enum UsernameRejection {
    "Not 3-30 lowercase letters, numbers and single hyphens."
    FORMAT
    "One of the words the platform keeps for itself (admin, support, …)."
    RESERVED
    "Somebody else already has it."
    TAKEN
  }

  type UsernameAvailability {
    "What the server actually checked — trimmed and lower-cased."
    username: String!
    available: Boolean!
    "Null when available."
    reason: UsernameRejection
  }

  type SavedPodState {
    pod_id: ID!
    saved: Boolean!
    saved_pod_ids: [ID!]!
  }

  """
  What the viewer's Follow button must render for this profile.
  REQUESTED only ever happens on a PRIVATE profile — a public one goes
  straight from NONE to FOLLOWING.
  """
  enum FollowStatus {
    NONE
    REQUESTED
    FOLLOWING
  }

  type PublicProfile {
    user_id: ID!
    """
    The stored, globally unique @handle — what /u/<username> carries and
    what the follow lists render. Accounts that predate the field fall back to
    a handle derived from the name until the migrate:usernames script has run,
    so this is never blank.
    """
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
    "The three-state Follow button. is_following stays as the FOLLOWING shorthand."
    follow_status: FollowStatus!
    """
    Whether THIS user follows the signed-in viewer — the other direction of the
    edge. What turns the viewer's Follow button into Follow Back. False with no
    viewer.
    """
    follows_viewer: Boolean!
    """
    The OPEN follow request this user has sent the viewer, if any — so the
    viewer can accept or deny it from the profile itself, not only from the
    notification about it. Null with no viewer or no open ask.
    """
    inbound_request_id: ID
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
    """
    One public profile. user_id accepts EITHER the @handle or a raw user id
    — every link shared before handles existed carries an id, and those links
    live in inboxes nobody can rewrite.
    """
    publicUserProfile(user_id: ID!): PublicProfile
    """
    Is this @handle free for the signed-in account? Debounced from the
    username field on Profile Settings; the save re-checks it anyway, because
    two people can be typing the same handle at once.
    """
    usernameAvailability(username: String!): UsernameAvailability!
    "People who follow the given user (their public profiles)."
    followersOf(user_id: ID!): [PublicProfile!]!
    "People the given user follows (their public profiles)."
    followingOf(user_id: ID!): [PublicProfile!]!
    "Open follow requests waiting on the signed-in user, newest first."
    myFollowRequests: [FollowRequest!]!
  }

  "A pending ask to follow a PRIVATE profile. Answering it is what creates the follow."
  type FollowRequest {
    id: ID!
    requester: PublicProfile!
    status: String!
    created_at: String!
  }

  extend type Mutation {
    updateMyProfile(input: UpdateMyProfileInput!): User!
    updateMyProfileVisibility(visibility: ProfileVisibility!): User!
    "Change the signed-in account's @handle. Rejects a taken or reserved one."
    setMyUsername(username: String!): User!
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
    """
    Follow a user. A PUBLIC profile is followed immediately; a PRIVATE one
    only opens a PENDING follow request and notifies its owner.
    """
    followUser(user_id: ID!): User!
    unfollowUser(user_id: ID!): User!
    "The private profile's owner accepts — this is what creates the follow."
    acceptFollowRequest(request_id: ID!): User!
    "The private profile's owner rejects. No follow is created."
    rejectFollowRequest(request_id: ID!): User!
    "The requester withdraws their own pending ask (tapping Requested)."
    cancelFollowRequest(user_id: ID!): User!
  }
`;
