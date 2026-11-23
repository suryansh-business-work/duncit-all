export const leadQualityTypeDefs = /* GraphQL */ `
  "An automatic check the server runs against a real source. NONE: a person or an AI assistant records the evidence."
  enum CrmLeadQualityAutoCheck {
    NONE
    CRM_UNIQUENESS
    EMAIL_DELIVERABLE
    INSTAGRAM_BUSINESS_PROFILE
    INSTAGRAM_FOLLOWERS_MIN
    INSTAGRAM_RECENT_POST_DAYS
    GOOGLE_MAPS_LISTING
    GOOGLE_REVIEWS_MIN
    WEBSITE_REACHABLE
  }

  "VERIFIED earns the item's points; PENDING (unknown) and FAILED (checked, not met) earn none."
  enum CrmLeadEvidenceStatus {
    VERIFIED
    PENDING
    FAILED
  }

  "Who decided an item: a person in the console, an AI assistant through MCP, the server's own check, or the discovery AI quoting a source."
  enum CrmLeadEvidenceVia {
    MANUAL
    MCP
    SYSTEM
    AI
  }

  enum CrmLeadQualification {
    QUALIFIED
    NOT_QUALIFIED
    PENDING_VERIFICATION
  }

  enum CrmLeadVerificationProgress {
    COMPLETE
    IN_PROGRESS
    PENDING
  }

  enum CrmLeadQualityConfigStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  enum CrmLeadQualityValidationMode {
    DRAFT
    PUBLISH
  }

  enum CrmLeadSearchSort {
    SCORE_DESC
    SCORE_ASC
    NEWEST
  }

  "A lead's Lead Quality Score as listings show it; null until the lead is first scored."
  type CrmLeadQualitySummary {
    score: Float!
    classification: String!
    classification_label: String!
    "success (green), warning (yellow) or error (red) — the score band's colour."
    tone: String!
    qualification: CrmLeadQualification!
    verification: CrmLeadVerificationProgress!
    failed_gates: Int!
    pending_gates: Int!
    pending_items: Int!
    config_version: Int
    scored_at: String
  }

  type CrmLeadQualitySubCriterion {
    key: String!
    name: String!
    points: Float!
    "A gate: the lead cannot qualify until this item is verified."
    mandatory: Boolean!
    auto_check: CrmLeadQualityAutoCheck!
    threshold: Int
    guidance: String!
  }

  type CrmLeadQualityCriterion {
    key: String!
    name: String!
    weightage: Float!
    enabled: Boolean!
    "A gate: the lead cannot qualify until at least one item of this criterion is verified."
    mandatory: Boolean!
    auto_check: CrmLeadQualityAutoCheck!
    threshold: Int
    guidance: String!
    sub_criteria: [CrmLeadQualitySubCriterion!]!
  }

  type CrmLeadQualityBand {
    key: String!
    label: String!
    min: Float!
    tone: String!
  }

  type CrmLeadQualityActor {
    id: ID
    name: String!
  }

  "One version of a lead type's scoring model. Published versions are never edited; a new draft is published instead."
  type CrmLeadQualityConfig {
    id: ID!
    lead_type: CrmEntityType!
    version: Int!
    status: CrmLeadQualityConfigStatus!
    criteria: [CrmLeadQualityCriterion!]!
    "Null: qualification depends on the mandatory gates only."
    min_qualification_score: Float
    bands: [CrmLeadQualityBand!]!
    change_note: String!
    revision: Int!
    "Sum of the enabled criteria's weightage (exactly 100 once published)."
    weightage_total: Float!
    created_by: CrmLeadQualityActor!
    updated_by: CrmLeadQualityActor!
    published_by: CrmLeadQualityActor
    published_at: String
    archived_at: String
    created_at: String
    updated_at: String
  }

  type CrmLeadQualitySettings {
    lead_type: CrmEntityType!
    published: CrmLeadQualityConfig!
    draft: CrmLeadQualityConfig
  }

  "One problem with a scoring configuration: where, a stable code the console translates, and the English message."
  type CrmLeadQualityIssue {
    path: String!
    code: String!
    message: String!
    amount: Float
  }

  input CrmLeadQualitySubCriterionInput {
    key: String
    name: String!
    points: Float!
    mandatory: Boolean
    auto_check: CrmLeadQualityAutoCheck
    threshold: Int
    guidance: String
  }

  input CrmLeadQualityCriterionInput {
    "Stable id evidence is stored against. Leave empty on a new criterion; it is made from the name."
    key: String
    name: String!
    weightage: Float!
    enabled: Boolean
    mandatory: Boolean
    auto_check: CrmLeadQualityAutoCheck
    threshold: Int
    guidance: String
    sub_criteria: [CrmLeadQualitySubCriterionInput!]
  }

  input CrmLeadQualityBandInput {
    key: String
    label: String!
    min: Float!
    "success, warning or error"
    tone: String!
  }

  "A scoring model as an array of criteria, each with optional sub-criteria. Enabled weightage must total exactly 100 to publish."
  input CrmLeadQualityConfigInput {
    criteria: [CrmLeadQualityCriterionInput!]!
    min_qualification_score: Float
    bands: [CrmLeadQualityBandInput!]!
  }

  type CrmLeadQualityPublishResult {
    config: CrmLeadQualityConfig!
    "The background job rescoring every lead of this type with the new version; null when the type has no leads."
    recalculation_job_id: ID
  }

  type CrmLeadQualityItemResult {
    "The key evidence is recorded against: criterion_key or criterion_key.sub_key."
    key: String!
    criterion_key: String!
    sub_key: String
    name: String!
    points: Float!
    earned: Float!
    status: CrmLeadEvidenceStatus!
    mandatory: Boolean!
    auto_check: CrmLeadQualityAutoCheck!
    threshold: Int
    guidance: String
  }

  type CrmLeadQualityCriterionResult {
    key: String!
    name: String!
    max: Float!
    earned: Float!
    "VERIFIED, PARTIAL, PENDING or FAILED"
    status: String!
    mandatory: Boolean!
    items: [CrmLeadQualityItemResult!]!
  }

  type CrmLeadQualityGate {
    key: String!
    name: String!
    "PASSED, FAILED or PENDING"
    state: String!
  }

  "The calculated score. The ring, the breakdown table and the qualification all read this one result."
  type CrmLeadQualityResult {
    score: Float!
    max_score: Float!
    classification: String!
    classification_label: String!
    tone: String!
    qualification: CrmLeadQualification!
    verification: CrmLeadVerificationProgress!
    min_qualification_score: Float
    potential_score: Float!
    gates: [CrmLeadQualityGate!]!
    verified_items: Int!
    pending_items: Int!
    failed_items: Int!
    criteria: [CrmLeadQualityCriterionResult!]!
  }

  type CrmLeadQualityEvidence {
    item_key: String!
    status: CrmLeadEvidenceStatus!
    evidence: String!
    source_url: String!
    notes: String!
    via: CrmLeadEvidenceVia!
    actor: CrmLeadQualityActor!
    decided_at: String!
  }

  type CrmLeadQualityDetails {
    entity_type: CrmEntityType!
    lead_id: ID!
    lead_name: String!
    result: CrmLeadQualityResult
    evidence: [CrmLeadQualityEvidence!]!
    scored_version: Int
    published_version: Int!
    "True when the stored score was worked out with an older configuration version (a recalculation is due)."
    stale: Boolean!
    scored_at: String
    "MANUAL or RESEARCH (added from a Lead Research candidate)."
    origin: String!
    config: CrmLeadQualityConfig!
  }

  type CrmLeadQualityScoreResponse {
    details: CrmLeadQualityDetails!
    "Automatic checks that could not run (no connected Instagram account, no Serper key…), and why."
    skipped_checks: [String!]!
  }

  "One decision on one item. VERIFIED needs the evidence (and, from MCP, the public source link); PENDING clears an earlier decision."
  input CrmLeadEvidenceDecisionInput {
    item_key: String!
    status: CrmLeadEvidenceStatus!
    evidence: String
    source_url: String
    notes: String
  }

  type CrmLeadQualityEvent {
    id: ID!
    "SCORE, EVIDENCE, CONFIG_DRAFT, CONFIG_PUBLISH or CONFIG_DISCARD"
    kind: String!
    entity_type: CrmEntityType!
    lead_id: ID
    trigger: String
    score_before: Float
    score_after: Float
    classification: String!
    qualification: String!
    config_version: Int
    item_key: String!
    status_before: String!
    status_after: String!
    evidence: String!
    source_url: String!
    via: CrmLeadEvidenceVia
    actor: CrmLeadQualityActor!
    note: String!
    created_at: String!
  }

  type CrmLeadQualityJobRef {
    "Null when nothing matched (no leads to score)."
    job_id: ID
    total: Int!
  }

  input CrmLeadSearchInput {
    "Lead types to search; all five when empty."
    entity_types: [CrmEntityType!]
    "Name, city, phone, email or Instagram link contains this."
    search: String
    city: String
    min_score: Float
    max_score: Float
    classification: String
    qualification: CrmLeadQualification
    verification: CrmLeadVerificationProgress
    has_failed_gates: Boolean
    "Only leads that have never been scored."
    unscored: Boolean
    sort: CrmLeadSearchSort
    page: Int
    "1-100, default 25."
    page_size: Int
  }

  type CrmLeadSearchRow {
    entity_type: CrmEntityType!
    id: ID!
    name: String!
    city: String!
    area: String!
    lead_status: String!
    instagram_link: String!
    website: String!
    phones: [String!]!
    emails: [String!]!
    quality: CrmLeadQualitySummary
    created_at: String
  }

  type CrmLeadSearchPage {
    rows: [CrmLeadSearchRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type CrmLeadQualityCount {
    key: String!
    label: String!
    count: Int!
  }

  type CrmLeadQualityTypeStats {
    entity_type: CrmEntityType!
    total: Int!
    scored: Int!
    average_score: Float
    qualified: Int!
    not_qualified: Int!
    pending_verification: Int!
    failed_gate_leads: Int!
    pending_items: Int!
    classifications: [CrmLeadQualityCount!]!
    distribution: [CrmLeadQualityCount!]!
  }

  type CrmLeadQualityTopLead {
    entity_type: CrmEntityType!
    id: ID!
    name: String!
    city: String!
    score: Float!
    classification_label: String!
    qualification: String!
  }

  type CrmLeadQualityCityStat {
    city: String!
    leads: Int!
    average_score: Float
    qualified: Int!
  }

  type CrmLeadQualityTrendPoint {
    week: String!
    leads: Int!
    average_score: Float
  }

  type CrmLeadQualityConversion {
    classification: String!
    label: String!
    leads: Int!
    won: Int!
    conversion_rate: Float
  }

  type CrmLeadQualityOrigin {
    origin: String!
    leads: Int!
    average_score: Float
    qualified: Int!
  }

  type CrmLeadQualityMissing {
    entity_type: CrmEntityType!
    criterion: String!
    leads: Int!
  }

  type CrmLeadQualityQueueStat {
    key: String!
    label: String!
    count: Int!
    average_score: Float
  }

  type CrmLeadQualityAnalytics {
    by_type: [CrmLeadQualityTypeStats!]!
    top_leads: [CrmLeadQualityTopLead!]!
    cities: [CrmLeadQualityCityStat!]!
    trend: [CrmLeadQualityTrendPoint!]!
    conversion: [CrmLeadQualityConversion!]!
    origins: [CrmLeadQualityOrigin!]!
    missing_evidence: [CrmLeadQualityMissing!]!
    duplicate_leads: Int!
    research_queue: [CrmLeadQualityQueueStat!]!
    generated_at: String!
  }

  extend type Query {
    "The published scoring model of a lead type (seeded with the default the first time) and its draft, if one is being edited."
    crmLeadQualitySettings(lead_type: CrmEntityType!): CrmLeadQualitySettings!
    "Every version of a lead type's scoring model, newest first."
    crmLeadQualityVersions(lead_type: CrmEntityType!): [CrmLeadQualityConfig!]!
    "Settings changes (drafts saved, versions published, drafts discarded) of a lead type, newest first."
    crmLeadQualitySettingsHistory(lead_type: CrmEntityType!, limit: Int): [CrmLeadQualityEvent!]!
    "Check a scoring model without saving it. Empty when valid. PUBLISH mode needs exactly 100%."
    validateCrmLeadQualityConfig(lead_type: CrmEntityType!, input: CrmLeadQualityConfigInput!, mode: CrmLeadQualityValidationMode!): [CrmLeadQualityIssue!]!
    "One lead's score, criterion-wise breakdown, evidence with sources and the configuration it was scored with."
    crmLeadQuality(entity_type: CrmEntityType!, lead_id: ID!): CrmLeadQualityDetails!
    "One lead's score and evidence history, newest first."
    crmLeadQualityHistory(entity_type: CrmEntityType!, lead_id: ID!, limit: Int): [CrmLeadQualityEvent!]!
    "Search existing CRM leads of every type by name, city and quality score, sorted by score."
    searchCrmLeads(input: CrmLeadSearchInput!): CrmLeadSearchPage!
    "Lead quality analytics from the stored scores, for one lead type or all five."
    crmLeadQualityAnalytics(entity_type: CrmEntityType): CrmLeadQualityAnalytics!
  }

  extend type Mutation {
    "Create or replace a lead type's draft scoring model. A draft may total under 100% but never over. Pass the revision you loaded to avoid overwriting someone else's save."
    saveCrmLeadQualityDraft(lead_type: CrmEntityType!, input: CrmLeadQualityConfigInput!, revision: Int, change_note: String): CrmLeadQualityConfig!
    "Start a draft from an existing version (edit the current one, or restore an older one)."
    startCrmLeadQualityDraftFromVersion(lead_type: CrmEntityType!, version: Int!): CrmLeadQualityConfig!
    "Publish the draft (must total exactly 100% with every criterion's sub-criteria adding up to it). Every lead of this type is rescored with it in the background."
    publishCrmLeadQualityConfig(lead_type: CrmEntityType!, revision: Int, change_note: String): CrmLeadQualityPublishResult!
    "Throw away the draft. The published version is untouched."
    deleteCrmLeadQualityDraft(lead_type: CrmEntityType!): Boolean!
    "Record evidence decisions on a lead's quality items, then rescore it. VERIFIED needs evidence; from MCP it also needs the public source link."
    recordCrmLeadEvidence(entity_type: CrmEntityType!, lead_id: ID!, decisions: [CrmLeadEvidenceDecisionInput!]!): CrmLeadQualityScoreResponse!
    "Rescore one lead now. external: also run the checks that call Instagram, Google Maps and the website (reverify)."
    recalculateCrmLeadQuality(entity_type: CrmEntityType!, lead_id: ID!, external: Boolean): CrmLeadQualityScoreResponse!
    "Rescore many leads in the background: the given ids, or every lead of the type when none are given."
    recalculateCrmLeadQualityScores(entity_type: CrmEntityType!, lead_ids: [ID!], external: Boolean): CrmLeadQualityJobRef!
  }
`;
