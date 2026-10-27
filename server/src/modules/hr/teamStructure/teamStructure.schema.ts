export const teamStructureTypeDefs = /* GraphQL */ `
  enum TeamNodeKind {
    HEAD
    DEPARTMENT
    ROLE
    AI_AGENT
  }
  enum TeamEmploymentType {
    FULL_TIME
    PART_TIME
    CONTRACT
    ADVISOR
    AI_AGENT
  }
  enum TeamNodeStatus {
    FILLED
    VACANT
    OPTIONAL
  }
  enum TeamPayKind {
    FIXED
    VARIABLE
  }
  enum TeamPayFrequency {
    MONTHLY
    ANNUAL
    PER_UNIT
  }

  "One line of a seat's pay. VARIABLE lines range min_amount..max_amount with amount as the expected figure."
  type TeamPayComponent {
    label: String!
    kind: TeamPayKind!
    frequency: TeamPayFrequency!
    amount: Float!
    min_amount: Float
    max_amount: Float
    note: String
  }

  input TeamPayComponentInput {
    label: String!
    kind: TeamPayKind!
    frequency: TeamPayFrequency!
    amount: Float!
    min_amount: Float
    max_amount: Float
    note: String
  }

  type TeamStructure {
    id: ID!
    name: String!
    description: String
    currency: String!
    updated_at: String
    "Seats on the chart. Only filled by teamStructures (the HR list)."
    seat_count: Int
    "Monthly pay budget of the non-optional seats. Only filled by teamStructures."
    monthly_cost: Float
  }

  "A seat on the chart. pay and monthly_cost are null on a public link that hides salary."
  type TeamStructureNode {
    id: ID!
    structure_id: ID!
    parent_id: ID
    kind: TeamNodeKind!
    title: String!
    person_name: String
    user_id: ID
    department: String
    employment_type: TeamEmploymentType!
    status: TeamNodeStatus!
    notes: String
    sort_order: Int!
    pay: [TeamPayComponent!]
    "Fixed + expected variable, per month. Per-unit lines are not counted."
    monthly_cost: Float
  }

  input TeamStructureNodeInput {
    "Pass an existing id to update, or a fresh/previously deleted id to (re)create the seat with it."
    id: ID
    parent_id: ID
    kind: TeamNodeKind!
    title: String!
    person_name: String
    user_id: ID
    department: String
    employment_type: TeamEmploymentType!
    status: TeamNodeStatus
    notes: String
    sort_order: Int
    pay: [TeamPayComponentInput!]
  }

  type TeamStructureView {
    structure: TeamStructure!
    nodes: [TeamStructureNode!]!
  }

  type TeamStructureShare {
    id: ID!
    structure_id: ID!
    token: String!
    label: String
    show_salary: Boolean!
    expires_at: String
    revoked_at: String
  }

  type PublicTeamStructure {
    structure: TeamStructure!
    nodes: [TeamStructureNode!]!
    show_salary: Boolean!
  }

  extend type Query {
    "HR console: every team structure (SUPER_ADMIN / HR_MANAGER)."
    teamStructures: [TeamStructure!]!
    "HR console: one structure with all its seats and pay."
    teamStructure(id: ID!): TeamStructureView!
    "HR console: share links of a structure."
    teamStructureShares(structure_id: ID!): [TeamStructureShare!]!
    "No sign-in: the chart behind a live share link. Pay only when the link allows it."
    publicTeamStructure(token: String!): PublicTeamStructure
  }

  extend type Mutation {
    saveTeamStructure(id: ID, name: String!, description: String, currency: String): TeamStructure!
    deleteTeamStructure(id: ID!): Boolean!
    "Create or update one seat. Moving a seat under its own descendant is refused."
    upsertTeamStructureNode(structure_id: ID!, input: TeamStructureNodeInput!): TeamStructureNode!
    "Delete one seat; its children move up to its parent."
    deleteTeamStructureNode(id: ID!): Boolean!
    createTeamStructureShare(structure_id: ID!, label: String, show_salary: Boolean, expires_at: String): TeamStructureShare!
    revokeTeamStructureShare(id: ID!): Boolean!
  }
`;
