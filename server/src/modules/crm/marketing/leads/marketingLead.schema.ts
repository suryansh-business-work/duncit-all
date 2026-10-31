import gql from 'graphql-tag';

/** Marketing → Leads: the one pipeline every source feeds, worked on the Leads page and promoted into the CRM. */
export const marketingLeadTypeDefs = gql`
  "What the lead is to Duncit — which team's pitch fits it."
  enum MarketingLeadPipeline {
    VENUE
    HOST
    BRAND
    INFLUENCER
    ADVERTISER
    GENERAL
  }

  "Where the conversation stands. CONVERTED and LOST are final."
  enum MarketingLeadStage {
    NEW
    CONTACTED
    REPLIED
    QUALIFIED
    CONVERTED
    LOST
  }

  "Where the lead first came from."
  enum MarketingLeadSource {
    INSTAGRAM
    GOOGLE_PLACES
    WEB_SEARCH
    IMPORT
    MANUAL
  }

  enum MarketingLeadTimelineKind {
    CREATED
    STAGE
    OWNER
    NOTE
    PROMOTED
    IMPORTED
    SOURCE
    "A step an Outreach sequence sent, or the reply that stopped it."
    OUTREACH
  }

  "The CRM record a lead can become: a venue lead, a host lead or an ecomm (seller) lead."
  enum MarketingLeadCrmKind {
    VENUE
    HOST
    ECOMM
  }

  enum MarketingLeadImportOutcome {
    ADDED
    MERGED
    SKIPPED
  }

  type MarketingLeadNote {
    at: String
    by_user_id: String
    by_name: String!
    text: String!
  }

  "One thing that happened to the lead, in the order it happened."
  type MarketingLeadTimelineEntry {
    at: String
    kind: MarketingLeadTimelineKind!
    text: String!
    by_name: String!
  }

  "The CRM record the lead became, once promoted."
  type MarketingLeadCrmRef {
    kind: MarketingLeadCrmKind!
    id: String!
    promoted_at: String
    promoted_by: String!
  }

  "Where the lead came from, by id: the Instagram lead, the search or the import run."
  type MarketingLeadSourceRef {
    ig_lead_id: String!
    search_id: String!
    import_id: String!
  }

  type MarketingLead {
    id: ID!
    name: String!
    company: String!
    pipeline: MarketingLeadPipeline!
    stage: MarketingLeadStage!
    source: MarketingLeadSource!
    emails: [String!]!
    "Digits only, dial code included when the source gave one."
    phones: [String!]!
    website: String!
    instagram_handle: String!
    instagram_url: String!
    city: String!
    "0-100 for how well the lead fits what it was found for; null when nobody scored it."
    score: Int
    score_reason: String!
    owner_user_id: String
    owner_name: String
    tags: [String!]!
    notes: [MarketingLeadNote!]!
    timeline: [MarketingLeadTimelineEntry!]!
    "Set once the lead has been handed to the CRM; a lead is promoted once."
    crm_ref: MarketingLeadCrmRef
    source_ref: MarketingLeadSourceRef!
    created_by: String
    created_at: String
    updated_at: String
  }

  type MarketingLeadTablePage {
    rows: [MarketingLead!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type MarketingLeadStageCount {
    stage: MarketingLeadStage!
    count: Int!
  }

  type MarketingLeadPipelineCount {
    pipeline: MarketingLeadPipeline!
    count: Int!
  }

  "How many leads sit at each stage and in each pipeline."
  type MarketingLeadSummary {
    total: Int!
    stages: [MarketingLeadStageCount!]!
    pipelines: [MarketingLeadPipelineCount!]!
  }

  "A lead as written or merged: merged is true when it matched a lead already here and updated that one instead."
  type MarketingLeadUpsert {
    lead: MarketingLead!
    merged: Boolean!
  }

  type MarketingLeadImportRowResult {
    "1-based, as the rows are counted in the file."
    row: Int!
    outcome: MarketingLeadImportOutcome!
    "Why the row was skipped; empty when it was not."
    reason: String!
    lead_id: String!
  }

  type MarketingLeadImportResult {
    added: Int!
    merged: Int!
    skipped: Int!
    "The run the import was recorded as, on Activity."
    run_id: String!
    rows: [MarketingLeadImportRowResult!]!
  }

  input MarketingLeadInput {
    name: String!
    company: String
    pipeline: MarketingLeadPipeline
    "Only read on create; a lead's stage is moved with setMarketingLeadStage."
    stage: MarketingLeadStage
    "Only read on create; defaults to MANUAL."
    source: MarketingLeadSource
    emails: [String!]
    phones: [String!]
    website: String
    instagram_handle: String
    city: String
    score: Int
    score_reason: String
    tags: [String!]
  }

  "Which column of the file holds which field; leave a field out when the file has no such column."
  input MarketingLeadImportMapping {
    name: Int!
    company: Int
    email: Int
    phone: Int
    website: Int
    instagram_handle: Int
    city: Int
    tags: Int
    "The pipeline every imported lead joins; GENERAL when not given."
    pipeline: MarketingLeadPipeline
  }

  extend type Query {
    "Every lead, newest first; filter by pipeline, stage, source, owner, city, score, dates or has_crm_ref; search name, company, contacts, website, handle or city."
    marketingLeadsTable(query: TableQueryInput): MarketingLeadTablePage!
    marketingLead(id: ID!): MarketingLead!
    marketingLeadSummary: MarketingLeadSummary!
  }

  extend type Mutation {
    "Add a lead by hand. One matching a known lead by phone, email, website or handle merges into it."
    createMarketingLead(input: MarketingLeadInput!): MarketingLeadUpsert!
    "Edit a lead. A phone, email, website or handle another lead already has is refused."
    updateMarketingLead(id: ID!, input: MarketingLeadInput!): MarketingLead!
    "Move the lead to a stage. LOST needs a note; any note given is kept on the lead."
    setMarketingLeadStage(id: ID!, stage: MarketingLeadStage!, note: String): MarketingLead!
    "Give the lead to a person (a living user), or to nobody with null."
    assignMarketingLeadOwner(id: ID!, owner_user_id: ID): MarketingLead!
    addMarketingLeadNote(id: ID!, text: String!): MarketingLead!
    "Rows of cells from a file (header row removed) become leads; bad rows are reported by number. Recorded as a LEAD_IMPORT run."
    importMarketingLeads(rows: [[String!]!]!, mapping: MarketingLeadImportMapping!): MarketingLeadImportResult!
    "Hand the lead to sales as a CRM record of the given kind. Once only; the kind must fit the pipeline."
    promoteMarketingLeadToCrm(id: ID!, kind: MarketingLeadCrmKind!): MarketingLead!
  }
`;
