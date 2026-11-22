export const leadResearchTypeDefs = /* GraphQL */ `
  "NEW: waiting for review. ADDED: now a CRM lead. REJECTED: dismissed. DUPLICATE: already in the CRM, can never be added."
  enum CrmLeadCandidateStatus {
    NEW
    ADDED
    REJECTED
    DUPLICATE
  }

  enum CrmLeadSourceKind {
    INSTAGRAM
    GOOGLE_MAPS
    WEB
  }

  "A public page a candidate was found on, with the text read from it."
  type CrmLeadCandidateSource {
    kind: CrmLeadSourceKind!
    url: String!
    title: String!
    text: String!
  }

  type CrmLeadCandidateDuplicate {
    entity_type: CrmEntityType!
    lead_id: ID!
    lead_name: String!
    "What matched, e.g. PHONE 98765 43210 or INSTAGRAM @thebarn."
    match: String!
  }

  "A researched lead in the CRM › Lead Research review queue, scored like a CRM lead."
  type CrmLeadCandidate {
    id: ID!
    lead_type: CrmEntityType!
    job_id: ID
    "DISCOVERY (found by a discovery job) or MCP (handed in by an AI assistant)."
    origin: String!
    name: String!
    city: String!
    area: String!
    address: String!
    category: String!
    description: String!
    phones: [String!]!
    emails: [String!]!
    website: String!
    instagram_handle: String!
    instagram_url: String!
    sources: [CrmLeadCandidateSource!]!
    evidence: [CrmLeadQualityEvidence!]!
    result: CrmLeadQualityResult
    score: Float
    qualification: CrmLeadQualification!
    classification_label: String!
    tone: String!
    config_version: Int
    "Items still unverified — what to research next."
    missing_evidence: [String!]!
    duplicates: [CrmLeadCandidateDuplicate!]!
    status: CrmLeadCandidateStatus!
    crm_lead_id: ID
    decided_by: CrmLeadQualityActor
    decided_at: String
    decision_note: String!
    skipped_checks: [String!]!
    created_by: CrmLeadQualityActor!
    created_at: String!
    updated_at: String!
  }

  type CrmLeadCandidateTablePage {
    rows: [CrmLeadCandidate!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CrmLeadCandidateSourceInput {
    kind: CrmLeadSourceKind
    "The public page (http/https) this lead was found on."
    url: String!
    title: String
    "The text read on that page (bio, listing, snippet)."
    text: String
  }

  "A researched lead. Use only facts found on public pages, and list those pages in sources — never invent handles, numbers or evidence."
  input CrmLeadCandidateInput {
    name: String!
    city: String
    area: String
    address: String
    category: String
    description: String
    phones: [String!]
    emails: [String!]
    website: String
    "Instagram profile link or handle."
    instagram: String
    sources: [CrmLeadCandidateSourceInput!]
    "Quality items already verified, each with its evidence and public source link."
    evidence: [CrmLeadEvidenceDecisionInput!]
  }

  type CrmLeadCandidateRefusal {
    index: Int!
    name: String!
    reasons: [String!]!
  }

  type CrmLeadCandidateQueued {
    index: Int!
    name: String!
    candidate_id: ID!
  }

  type CrmLeadCandidateSaveReport {
    "New candidates queued for review."
    saved: [CrmLeadCandidate!]!
    "Queued as DUPLICATE: they match an existing CRM lead and can never be added."
    duplicates: [CrmLeadCandidate!]!
    "Not saved: the same lead is already in the queue."
    already_queued: [CrmLeadCandidateQueued!]!
    "Not saved: invalid or untraceable input, with the reasons."
    refused: [CrmLeadCandidateRefusal!]!
  }

  type CrmLeadCandidateApproval {
    candidate_id: ID!
    name: String!
    "ADDED, DUPLICATE, NOT_QUALIFIED, SKIPPED or FAILED"
    outcome: String!
    crm_lead_id: ID
    message: String!
  }

  type CrmLeadQueuedCandidate {
    candidate_id: ID!
    name: String!
    lead_type: CrmEntityType!
    status: CrmLeadCandidateStatus!
  }

  type CrmLeadDuplicateCheck {
    lead_type: CrmEntityType!
    is_duplicate: Boolean!
    crm_matches: [CrmLeadCandidateDuplicate!]!
    queued_candidates: [CrmLeadQueuedCandidate!]!
  }

  type CrmLeadDiscoveryStats {
    found: Int!
    saved: Int!
    qualifying: Int!
    duplicates: Int!
    already_queued: Int!
    refused: Int!
  }

  "A lead discovery running (or finished) in the background."
  type CrmLeadDiscoveryJob {
    id: ID!
    status: BackgroundJobStatus!
    label: String!
    "The number of qualifying new leads asked for."
    total: Int!
    "Qualifying new leads found so far."
    succeeded: Int!
    failed: Int!
    failures: [BackgroundJobFailure!]!
    error_message: String!
    created_at: String!
    finished_at: String
    lead_type: CrmEntityType!
    city: String!
    locality: String!
    category: String!
    keywords: String!
    target_count: Int!
    min_score: Float
    sources: [CrmLeadSourceKind!]!
    queries: [String!]!
    plan_note: String!
    searches_run: Int!
    stats: CrmLeadDiscoveryStats!
    candidates: [CrmLeadCandidate!]!
  }

  input CrmLeadDiscoveryInput {
    lead_type: CrmEntityType!
    city: String!
    locality: String
    category: String
    keywords: String
    "How many qualifying new leads to find, 1-100 (default 20)."
    target_count: Int
    "Count only candidates scoring at least this (0-100)."
    min_score: Float
    "INSTAGRAM and/or GOOGLE_MAPS; defaults by lead type."
    sources: [CrmLeadSourceKind!]
    "Let the AI quote evidence from each candidate's public text (default true)."
    ai_evidence: Boolean
  }

  extend type Query {
    "The Lead Research review queue (search, filter by status, lead type, job or score; sort by score)."
    crmLeadCandidatesTable(query: TableQueryInput): CrmLeadCandidateTablePage!
    "One researched candidate with its score breakdown, evidence, sources and CRM duplicates."
    crmLeadCandidate(id: ID!): CrmLeadCandidate
    "A discovery job's progress, counts, failures and best candidates."
    crmLeadDiscoveryJob(id: ID!, candidate_limit: Int): CrmLeadDiscoveryJob!
    "Recent discovery jobs, newest first."
    crmLeadDiscoveryJobs(limit: Int): [CrmLeadDiscoveryJob!]!
    "Would this lead be a duplicate? Existing CRM leads (any type) and queued candidates sharing its phone, email, website or Instagram."
    checkCrmLeadDuplicates(lead_type: CrmEntityType!, input: CrmLeadCandidateInput!): CrmLeadDuplicateCheck!
  }

  extend type Mutation {
    "Start a background discovery of new public leads (Instagram and Google Maps through Serper). Candidates go to the review queue, never straight into the CRM."
    startCrmLeadDiscovery(input: CrmLeadDiscoveryInput!): CrmLeadDiscoveryJob!
    "Run a finished, failed or cancelled discovery again with the same request."
    retryCrmLeadDiscovery(id: ID!): CrmLeadDiscoveryJob!
    "Stop a running discovery after its current search. Candidates found so far stay queued."
    cancelCrmLeadDiscovery(id: ID!): CrmLeadDiscoveryJob!
    "Queue researched leads for review: validated, checked against every CRM lead and earlier batches for duplicates, and scored with the published model."
    saveCrmLeadCandidates(lead_type: CrmEntityType!, candidates: [CrmLeadCandidateInput!]!, external_checks: Boolean): CrmLeadCandidateSaveReport!
    "Record evidence on a queued candidate and rescore it."
    verifyCrmLeadCandidateEvidence(id: ID!, decisions: [CrmLeadEvidenceDecisionInput!]!, external_checks: Boolean): CrmLeadCandidate!
    "Add candidates to the CRM as leads. Only QUALIFIED, non-duplicate candidates are added unless allow_unqualified is true."
    approveCrmLeadCandidates(ids: [ID!]!, allow_unqualified: Boolean, note: String): [CrmLeadCandidateApproval!]!
    "Dismiss candidates from the queue. Returns how many were rejected."
    rejectCrmLeadCandidates(ids: [ID!]!, note: String): Int!
  }
`;
