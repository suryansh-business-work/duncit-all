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
    """
    The admin Location (city) the gig is in. Null on gigs posted before the city picker.
    """
    location_id: ID
    """
    One of that city's areas (a Location zone name), or empty for the whole city.
    """
    locality: String!
    """
    The city's name — copied from the Location, or the typed text on older gigs.
    """
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
    The poster's contact. Only for the poster and for a freelancer who said they are interested;
    anyone else signed in reads it with gigJobContact.
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
    location_id: ID
    locality: String!
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

  """
  The Gig Jobs console's dashboard numbers.
  """
  type GigJobStats {
    total: Int!
    open: Int!
    closed: Int!
    interests: Int!
    freelancers: Int!
    posters: Int!
    categories: Int!
  }

  type GigJobAdminRow {
    id: ID!
    title: String!
    category_title: String!
    roles: [String!]!
    event_type: GigEventType!
    event_date: String
    city: String!
    budget: Int
    openings: Int!
    status: GigJobStatus!
    poster_role: GigPosterRole!
    poster_name: String!
    poster_user_id: ID!
    interest_count: Int!
    contact: GigContact!
    created_at: String!
  }

  type GigJobAdminTablePage {
    rows: [GigJobAdminRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type FreelancerAdminRow {
    id: ID!
    user_id: ID!
    display_name: String!
    city: String!
    skills: [String!]!
    category_titles: [String!]!
    experience_years: Int!
    portfolio_url: String!
    contact: GigContact!
    is_available: Boolean!
    created_at: String!
  }

  type FreelancerAdminTablePage {
    rows: [FreelancerAdminRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type GigInterestAdminRow {
    id: ID!
    job_id: ID!
    job_title: String!
    freelancer_name: String!
    skills: [String!]!
    message: String!
    contact: GigContact!
    created_at: String!
  }

  type GigInterestAdminTablePage {
    rows: [GigInterestAdminRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input GigJobFilter {
    category_id: ID
    """
    The admin Location (city). Wins over city, which older clients send as typed text.
    """
    location_id: ID
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
    """
    The admin Location (city). Required unless an older client sends city instead.
    """
    location_id: ID
    """
    One of that Location's zone names; empty for the whole city.
    """
    locality: String
    """
    Typed city — only read when location_id is absent; otherwise filled from the Location.
    """
    city: String
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
    location_id: ID
    locality: String
    city: String
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
    """
    The poster's contact for any signed-in member ("View contact"). Each reveal is logged.
    """
    gigJobContact(job_id: ID!): GigContact!
    gigViewer: GigViewer!
    myFreelancerProfile: FreelancerProfile
    gigCategoriesTable(query: TableQueryInput): GigCategoryTablePage!
    "The Gig Jobs console (SUPER_ADMIN / GIG_JOBS_MANAGER)."
    gigJobStats: GigJobStats!
    gigJobsAdminTable(query: TableQueryInput): GigJobAdminTablePage!
    freelancersAdminTable(query: TableQueryInput): FreelancerAdminTablePage!
    gigInterestsAdminTable(query: TableQueryInput, job_id: ID): GigInterestAdminTablePage!
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
    adminSetGigJobStatus(id: ID!, status: GigJobStatus!): Boolean!
    adminDeleteGigJob(id: ID!): Boolean!
  }
`;
