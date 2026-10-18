export const gigJobTypeDefs = /* GraphQL */ `
  """
  Who a gig is posted as. ECOMM_MANAGER is a Partner Brand owner.
  """
  enum GigPosterRole {
    HOST
    VENUE_OWNER
    ECOMM_MANAGER
  }

  enum GigEventType {
    EVENT
    WORKSHOP
    OTHER
  }

  enum GigJobStatus {
    OPEN
    CLOSED
  }

  type GigCategory {
    id: ID!
    slug_id: String!
    title: String!
    description: String!
    """
    The gig roles under this category, offered as picks on a post and a freelancer's skills.
    """
    examples: [String!]!
    sort_order: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  type GigCategoryTablePage {
    rows: [GigCategory!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type GigContact {
    name: String!
    phone: String!
    email: String!
  }

  type GigJob {
    id: ID!
    title: String!
    description: String!
    category_id: ID!
    category_title: String!
    roles: [String!]!
    event_type: GigEventType!
    event_date: String
    city: String!
    location: String!
    """
    Rupees. Null = to be discussed with the poster.
    """
    budget: Int
    openings: Int!
    status: GigJobStatus!
    poster_role: GigPosterRole!
    poster_name: String!
    interest_count: Int!
    is_mine: Boolean!
    viewer_interested: Boolean!
    """
    The poster's contact. Only for the poster and for a freelancer who said they are interested.
    """
    contact: GigContact
    created_at: String!
    updated_at: String!
  }

  type GigJobPage {
    rows: [GigJob!]!
    total: Int!
  }

  type GigInterest {
    id: ID!
    job_id: ID!
    freelancer_name: String!
    skills: [String!]!
    message: String!
    contact: GigContact!
    created_at: String!
  }

  type FreelancerProfile {
    id: ID!
    display_name: String!
    category_ids: [ID!]!
    skills: [String!]!
    city: String!
    bio: String!
    portfolio_url: String!
    experience_years: Int!
    contact_phone: String!
    contact_email: String!
    is_available: Boolean!
    updated_at: String!
  }

  """
  What the signed-in member may do on the gig board.
  """
  type GigViewer {
    poster_roles: [GigPosterRole!]!
    is_freelancer: Boolean!
    default_contact: GigContact!
  }

  input GigJobFilter {
    category_id: ID
    city: String
    search: String
    event_type: GigEventType
  }

  input GigJobInput {
    poster_role: GigPosterRole!
    category_id: ID!
    title: String!
    description: String
    roles: [String!]!
    event_type: GigEventType
    event_date: String
    city: String!
    location: String
    budget: Int
    openings: Int
    contact_name: String!
    contact_phone: String!
    contact_email: String
  }

  input FreelancerProfileInput {
    display_name: String!
    category_ids: [ID!]!
    skills: [String!]!
    city: String!
    bio: String
    portfolio_url: String
    experience_years: Int
    contact_phone: String!
    contact_email: String
    is_available: Boolean
  }

  input GigCategoryInput {
    title: String!
    description: String
    examples: [String!]!
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    gigCategories: [GigCategory!]!
    gigJobs(filter: GigJobFilter, offset: Int, limit: Int): GigJobPage!
    gigJob(id: ID!): GigJob
    myGigJobs(offset: Int, limit: Int): GigJobPage!
    gigJobInterests(job_id: ID!): [GigInterest!]!
    gigViewer: GigViewer!
    myFreelancerProfile: FreelancerProfile
    gigCategoriesTable(query: TableQueryInput): GigCategoryTablePage!
  }

  extend type Mutation {
    createGigJob(input: GigJobInput!): GigJob!
    updateGigJob(id: ID!, input: GigJobInput!): GigJob!
    setGigJobStatus(id: ID!, status: GigJobStatus!): GigJob!
    expressGigInterest(job_id: ID!, message: String): GigJob!
    saveFreelancerProfile(input: FreelancerProfileInput!): FreelancerProfile!
    createGigCategory(input: GigCategoryInput!): GigCategory!
    updateGigCategory(id: ID!, input: GigCategoryInput!): GigCategory!
    deleteGigCategory(id: ID!): Boolean!
  }
`;
