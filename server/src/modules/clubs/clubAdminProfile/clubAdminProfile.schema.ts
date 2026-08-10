export const clubAdminProfileTypeDefs = /* GraphQL */ `
  "A club this Club Admin runs."
  type ClubAdminAssignedClub {
    id: ID!
    club_name: String!
  }

  "A club that matches the Club Admin's taxonomy, for the Assign Clubs picker."
  type ClubAdminClubOption {
    id: ID!
    club_name: String!
    "Whether this admin already runs it."
    assigned: Boolean!
    """
    False for a club they run from outside their own category. Listed anyway,
    because a club that is assigned but not shown cannot be given back.
    """
    matches_category: Boolean!
  }

  """
  The onboarded Club Admin record — the Club Admin counterpart of Host, Venue
  and E-Commerce Brand. Created when their onboarding meeting is approved.
  """
  type ClubAdminProfile {
    id: ID!
    "Immutable public id, e.g. CADM-000001."
    club_admin_no: String
    user_id: ID!
    full_name: String!
    email: String!
    phone: String!
    "Names of the taxonomy chosen in the onboarding gate."
    super_category: String
    category: String
    sub_category: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    "Every club this admin runs. Empty until clubs are assigned in Review."
    assigned_clubs: [ClubAdminAssignedClub!]!
    "DRAFT until reviewed, then APPROVED or REJECTED."
    status: String!
    "Separate from status: a switch onboarding can flip back."
    is_active: Boolean!
    "Null or 0 inherits the platform default."
    commission_pct: Float
    "When onboarding completed."
    joined_at: String
    reviewer_notes: String
    "The onboarding meeting request this came from."
    request_no: String
    created_at: String
  }

  type ClubAdminProfileTablePage {
    rows: [ClubAdminProfile!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input UpdateClubAdminProfileInput {
    full_name: String
    email: String
    phone: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    commission_pct: Float
  }

  "What a backfill run did, so an operator can see it worked."
  type ClubAdminBackfillResult {
    created: Int!
    skipped: Int!
  }

  extend type Query {
    "Onboarded Club Admins, for the Onboarding portal's table."
    clubAdminProfilesTable(query: TableQueryInput): ClubAdminProfileTablePage!
    clubAdminProfile(id: ID!): ClubAdminProfile
    """
    Clubs for the Assign Clubs picker: this Club Admin's Super > Category > Sub,
    plus any club they already run that falls outside it.
    """
    clubAdminMatchingClubs(id: ID!, search: String): [ClubAdminClubOption!]!
    """
    Club Admins whose onboarding taxonomy matches a club's — the picker on the
    New Club form.

    The mirror of clubAdminMatchingClubs. Without it the form offered every
    CLUB_ADMIN role-holder on the platform, so a club could be handed to an
    admin onboarded for an unrelated category. Matching happens at the level
    the CLUB supplies; passing no category returns everyone, so the picker
    still works before one is chosen. APPROVED + active only — a DRAFT profile
    is somebody mid-onboarding who cannot yet be handed a club.
    """
    clubAdminCandidates(
      super_category_id: ID
      category_id: ID
      sub_category_id: ID
      search: String
    ): [ClubAdminCandidate!]!
  }

  "One assignable Club Admin, in the shape the club form's picker renders."
  type ClubAdminCandidate {
    user_id: ID!
    full_name: String!
    email: String!
  }

  extend type Mutation {
    updateClubAdminProfile(id: ID!, input: UpdateClubAdminProfileInput!): ClubAdminProfile!
    "Approve the Club Admin — the table reads Active from here on."
    approveClubAdminProfile(id: ID!, notes: String): ClubAdminProfile!
    "Reject the Club Admin. A reason is required."
    rejectClubAdminProfile(id: ID!, notes: String!): ClubAdminProfile!
    "Set the pay commission. Null or 0 inherits the platform default."
    setClubAdminCommission(id: ID!, commission_pct: Float): ClubAdminProfile!
    setClubAdminProfileActive(id: ID!, is_active: Boolean!): ClubAdminProfile!
    "Replace the set of clubs this admin runs. Other admins of those clubs are untouched."
    assignClubAdminClubs(id: ID!, club_ids: [ID!]!): ClubAdminProfile!
    """
    Delete the onboarding record and unassign every club. The user account and
    its role stay — deleting an onboarding record must not delete a login.
    Re-confirmed with the caller's own credentials; it cannot be undone.
    """
    deleteClubAdminProfile(id: ID!, email: String!, password: String!): Boolean!
    "Give every existing Club Admin a record and an id. Idempotent."
    backfillClubAdminProfiles: ClubAdminBackfillResult!
  }
`;
