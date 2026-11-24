import gql from 'graphql-tag';

export const crmTypeDefs = gql`
  type CrmContact {
    name: String
    role: String
    mobile_number: String
    whatsapp_number: String
    email: String
  }

  input CrmContactInput {
    name: String
    role: String
    mobile_number: String
    whatsapp_number: String
    email: String
  }

  "A social profile beyond the main Instagram link (YouTube, Facebook, Linktree…)."
  type CrmSocialLink {
    name: String!
    url: String!
  }

  input CrmSocialLinkInput {
    name: String!
    url: String!
  }

  type CrmServiceOffered {
    service: String!
    custom_name: String
    description: String
  }

  input CrmServiceOfferedInput {
    service: String!
    custom_name: String
    description: String
  }

  type CrmActivity {
    "A manual log's id (edit / delete it with this). Null for EMAIL / CALL entries and audit entries."
    id: ID
    "EMAIL, CALL, NOTE (a manual log), or NOTE_CREATED / NOTE_UPDATED / NOTE_DELETED (a manual log's history; target = its id)."
    type: String!
    summary: String
    status: String
    target: String
    "Empty once the log is deleted."
    body_html: String
    body_text: String
    "CRM users the log @mentions (crmUsersByIds names them)."
    mention_user_ids: [ID!]!
    created_by: String
    created_at: String
    updated_by: String
    updated_at: String
    deleted_by: String
    deleted_at: String
    "A deleted manual log keeps its place in the history, without its words."
    is_deleted: Boolean!
    "True when the signed-in user may edit / delete this manual log (its author, or a SUPER_ADMIN)."
    can_change: Boolean!
  }

  "A CRM team member, or the name behind a user id the CRM shows. Email and roles only for active CRM staff."
  type CrmStaffUser {
    id: ID!
    name: String!
    email: String
    roles: [String!]!
    is_staff: Boolean!
  }

  type CrmLinkedHost {
    id: ID!
    host_name: String!
    host_type: String
    city: String
    lead_status: String
    priority: String
  }

  enum CrmEntityType {
    VENUE_LEAD
    HOST_LEAD
    ECOMM_LEAD
    CREATOR_LEAD
    COMMUNITY_LEAD
  }

  enum CrmDynamicFieldKind {
    text
    textarea
    number
    boolean
    date
    select
  }

  type CrmDynamicFieldOption {
    value: String!
    label: String!
  }

  type CrmDynamicField {
    id: ID!
    name: String!
    label: String!
    kind: CrmDynamicFieldKind!
    options: [CrmDynamicFieldOption!]!
    multi: Boolean!
    placeholder: String!
    default_value: String!
    hint: String!
    applies_to_venue: Boolean!
    applies_to_host: Boolean!
    applies_to_ecomm: Boolean!
    applies_to_creator: Boolean!
    applies_to_community: Boolean!
    required: Boolean!
    sort_order: Int!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  input CrmDynamicFieldOptionInput {
    value: String!
    label: String!
  }

  input CrmDynamicFieldInput {
    name: String!
    label: String!
    kind: CrmDynamicFieldKind!
    options: [CrmDynamicFieldOptionInput!]
    multi: Boolean
    placeholder: String
    default_value: String
    hint: String
    applies_to_venue: Boolean
    applies_to_host: Boolean
    applies_to_ecomm: Boolean
    applies_to_creator: Boolean
    applies_to_community: Boolean
    required: Boolean
    sort_order: Int
    is_active: Boolean
  }

  input ManualLogInput {
    entity_type: CrmEntityType!
    entity_id: ID!
    summary: String
    "Rich text. Each @mention is a span with data-type mention and data-id set to the user id; every mentioned CRM team member is emailed."
    body_html: String!
    body_text: String
  }

  input UpdateManualLogInput {
    entity_type: CrmEntityType!
    entity_id: ID!
    log_id: ID!
    summary: String
    body_html: String!
    body_text: String
  }

  enum CrmServiceKind {
    VENUE
    HOST
    ECOMM
  }

  type CrmService {
    id: ID!
    name: String!
    kind: CrmServiceKind!
    sort_order: Int!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  input CrmServiceInput {
    name: String!
    kind: CrmServiceKind!
    sort_order: Int
    is_active: Boolean
  }

  type CrmSuperCategoryRef {
    id: ID!
    name: String!
    slug: String!
    icon: String
  }

  "A Duncit user whose email/phone matches one of the lead's contacts (computed live)."
  type CrmMatchedUser {
    user_id: ID!
    full_name: String
    email: String
    phone: String
    profile_photo: String
    matched_on: String!
    "Every platform the account has used Duncit from while signed in, in display order (ANDROID, IOS, WEB)."
    platforms_used: [UserPlatform!]!
    "ISO time of the account's last signed-in request, or null when none was seen."
    last_activity_at: String
  }

  type VenueLead {
    id: ID!
    super_category_id: ID
    category_ids: [ID!]!
    sub_category_ids: [ID!]!
    super_category: CrmSuperCategoryRef
    matched_user: CrmMatchedUser
    venue_name: String!
    venue_types: [String!]!
    venue_type_other: String
    venue_description: String
    capacity_min: Int
    capacity_max: Int
    space_type: String
    city: String!
    area: String
    full_address: String!
    landmark: String
    map_link: String
    contacts: [CrmContact!]!
    event_suitability: [String!]!
    available_days: [String!]!
    available_time_slots: String
    booking_notice: String
    pricing_models: [String!]!
    expected_charges: Float
    security_deposit: Float
    gst_applicable: Boolean!
    invoice_available: Boolean!
    amenities: [String!]!
    photos: [String!]!
    videos: [String!]!
    brochure_url: String
    website: String
    services_offered: [CrmServiceOffered!]!
    instagram_link: String
    social_links: [CrmSocialLink!]!
    linked_host_ids: [ID!]!
    linked_hosts: [CrmLinkedHost!]!
    tags: [String!]!
    logo_url: String
    "Stringified JSON map of dynamic field values. Empty object when none set."
    dynamic_values_json: String!
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    remarks: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
    "True when another lead of any kind shares one of this lead's phone numbers, emails or its website. Set on table pages (the Leads listing); null elsewhere."
    is_duplicate: Boolean
    "Lead Quality Score summary (score, classification, qualification); null until the lead is first scored."
    quality: CrmLeadQualitySummary
    "Kilometres from the centre of a Nearby leads search. Set only on a table page read with near; null elsewhere."
    distance_km: Float
    "How exactly the lead sits on the map: PIN (its map link), AREA or CITY (that centre). Null until a Nearby leads search places it, or when it has no known city."
    geo_precision: String
  }

  type HostLead {
    id: ID!
    super_category_id: ID
    category_ids: [ID!]!
    sub_category_ids: [ID!]!
    super_category: CrmSuperCategoryRef
    matched_user: CrmMatchedUser
    host_name: String!
    host_type: String
    organization_name: String
    city: String
    area: String
    contacts: [CrmContact!]!
    interests: [String!]!
    expected_audience_size: String
    frequency: String
    budget_range: String
    revenue_models: [String!]!
    need_venue: Boolean!
    need_vendor: Boolean!
    preferred_event_date: String
    preferred_day: String
    preferred_time_slot: String
    website: String
    services_offered: [CrmServiceOffered!]!
    social_links: [CrmSocialLink!]!
    instagram_link: String
    community_link: String
    community_size: Int
    previous_events_hosted: Boolean!
    past_attendees: Int
    host_intent_scores: [String!]!
    tags: [String!]!
    profile_photo_url: String
    dynamic_values_json: String!
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
    "True when another lead of any kind shares one of this lead's phone numbers, emails or its website. Set on table pages (the Leads listing); null elsewhere."
    is_duplicate: Boolean
    "Lead Quality Score summary (score, classification, qualification); null until the lead is first scored."
    quality: CrmLeadQualitySummary
    "Kilometres from the centre of a Nearby leads search. Set only on a table page read with near; null elsewhere."
    distance_km: Float
    "How exactly the lead sits on the map: PIN (its map link), AREA or CITY (that centre). Null until a Nearby leads search places it, or when it has no known city."
    geo_precision: String
  }

  type EcommLead {
    id: ID!
    super_category_id: ID
    category_ids: [ID!]!
    sub_category_ids: [ID!]!
    super_category: CrmSuperCategoryRef
    matched_user: CrmMatchedUser
    seller_name: String!
    brand_name: String
    business_type: String
    city: String
    area: String
    contacts: [CrmContact!]!
    product_categories: [String!]!
    catalog_size: String
    price_range: String
    fulfilment_mode: String
    monthly_orders: String
    gst_number: String
    gst_applicable: Boolean!
    website: String
    instagram_link: String
    marketplace_links: [String!]!
    services_offered: [CrmServiceOffered!]!
    social_links: [CrmSocialLink!]!
    tags: [String!]!
    profile_photo_url: String
    dynamic_values_json: String!
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
    "True when another lead of any kind shares one of this lead's phone numbers, emails or its website. Set on table pages (the Leads listing); null elsewhere."
    is_duplicate: Boolean
    "Lead Quality Score summary (score, classification, qualification); null until the lead is first scored."
    quality: CrmLeadQualitySummary
    "Kilometres from the centre of a Nearby leads search. Set only on a table page read with near; null elsewhere."
    distance_km: Float
    "How exactly the lead sits on the map: PIN (its map link), AREA or CITY (that centre). Null until a Nearby leads search places it, or when it has no known city."
    geo_precision: String
  }

  type CrmOptionGroup {
    venue_types: [String!]!
    space_types: [String!]!
    venue_event_suitability: [String!]!
    week_days: [String!]!
    booking_notices: [String!]!
    pricing_models: [String!]!
    amenities: [String!]!
    lead_sources: [String!]!
    venue_lead_statuses: [String!]!
    host_lead_statuses: [String!]!
    priorities: [String!]!
    host_types: [String!]!
    host_interests: [String!]!
    audience_sizes: [String!]!
    frequencies: [String!]!
    revenue_models: [String!]!
    host_intent_scores: [String!]!
    services_offered_options: [String!]!
    venue_services_offered_options: [String!]!
    host_services_offered_options: [String!]!
    creator_platforms: [String!]!
    collaboration_types: [String!]!
    community_types: [String!]!
    community_platforms: [String!]!
  }

  input VenueLeadInput {
    super_category_id: ID
    category_ids: [ID!]
    sub_category_ids: [ID!]
    venue_name: String!
    venue_types: [String!]
    venue_type_other: String
    venue_description: String
    capacity_min: Int
    capacity_max: Int
    space_type: String
    city: String!
    area: String
    full_address: String!
    landmark: String
    map_link: String
    contacts: [CrmContactInput!]
    event_suitability: [String!]
    available_days: [String!]
    available_time_slots: String
    booking_notice: String
    pricing_models: [String!]
    expected_charges: Float
    security_deposit: Float
    gst_applicable: Boolean
    invoice_available: Boolean
    amenities: [String!]
    photos: [String!]
    videos: [String!]
    brochure_url: String
    website: String
    services_offered: [CrmServiceOfferedInput!]
    instagram_link: String
    social_links: [CrmSocialLinkInput!]
    linked_host_ids: [ID!]
    tags: [String!]
    logo_url: String
    dynamic_values_json: String
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String
    priority: String
    next_follow_up_date: String
    remarks: String
  }

  input HostLeadInput {
    super_category_id: ID
    category_ids: [ID!]
    sub_category_ids: [ID!]
    host_name: String!
    host_type: String
    organization_name: String
    city: String
    area: String
    contacts: [CrmContactInput!]
    interests: [String!]
    expected_audience_size: String
    frequency: String
    budget_range: String
    revenue_models: [String!]
    need_venue: Boolean
    need_vendor: Boolean
    preferred_event_date: String
    preferred_day: String
    preferred_time_slot: String
    website: String
    services_offered: [CrmServiceOfferedInput!]
    social_links: [CrmSocialLinkInput!]
    instagram_link: String
    community_link: String
    community_size: Int
    previous_events_hosted: Boolean
    past_attendees: Int
    host_intent_scores: [String!]
    tags: [String!]
    profile_photo_url: String
    dynamic_values_json: String
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String
    priority: String
    next_follow_up_date: String
    notes: String
  }

  input EcommLeadInput {
    super_category_id: ID
    category_ids: [ID!]
    sub_category_ids: [ID!]
    seller_name: String!
    brand_name: String
    business_type: String
    city: String
    area: String
    contacts: [CrmContactInput!]
    product_categories: [String!]
    catalog_size: String
    price_range: String
    fulfilment_mode: String
    monthly_orders: String
    gst_number: String
    gst_applicable: Boolean
    website: String
    instagram_link: String
    marketplace_links: [String!]
    services_offered: [CrmServiceOfferedInput!]
    social_links: [CrmSocialLinkInput!]
    tags: [String!]
    profile_photo_url: String
    dynamic_values_json: String
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String
    priority: String
    next_follow_up_date: String
    notes: String
  }

  "Centre and radius of a Nearby leads search: the searcher position (lat and lng together) or a city, optionally with an area, from the admin Location list. radius_km is 0.5 to 50."
  input CrmLeadNearInput {
    lat: Float
    lng: Float
    city: String
    area: String
    radius_km: Float!
  }

  input CrmLeadFilter {
    search: String
    city: String
    lead_status: String
    priority: String
    super_category_id: ID
  }

  "Server-side table page for the shared table engine (venueLeadsTable)."
  type VenueLeadTablePage {
    rows: [VenueLead!]!
    total: Int!
    page: Int!
    page_size: Int!
    "Leads of this kind with no place on the map (no city, or one the map does not know), so a Nearby leads search cannot include them. Null outside a nearby search."
    unplaced: Int
  }

  "Server-side table page for the shared table engine (hostLeadsTable)."
  type HostLeadTablePage {
    rows: [HostLead!]!
    total: Int!
    page: Int!
    page_size: Int!
    "Leads of this kind with no place on the map (no city, or one the map does not know), so a Nearby leads search cannot include them. Null outside a nearby search."
    unplaced: Int
  }

  "Server-side table page for the shared table engine (ecommLeadsTable)."
  type EcommLeadTablePage {
    rows: [EcommLead!]!
    total: Int!
    page: Int!
    page_size: Int!
    "Leads of this kind with no place on the map (no city, or one the map does not know), so a Nearby leads search cannot include them. Null outside a nearby search."
    unplaced: Int
  }

  type LeadContactActionResult {
    ok: Boolean!
    message: String!
    provider: String!
    provider_id: ID
    external_id: String
    recording_url: String
  }

  enum CrmAiEntity {
    VENUE_LEAD
    HOST_LEAD
    ECOMM_LEAD
  }

  "Result of placing a CRM call (AI or portal/agent-bridge)."
  type CrmAiCallResult {
    ok: Boolean!
    message: String!
    log_id: ID
    external_id: String
    status: String
    "Why the call was not placed (e.g. TWILIO_NOT_CONFIGURED), for the portal to act on."
    code: String
  }

  type CrmExcelImportError {
    row: Int!
    message: String!
  }

  type CrmExcelImportResult {
    inserted: Int!
    failed: Int!
    errors: [CrmExcelImportError!]!
  }

  type CrmExcelFile {
    filename: String!
    content_base64: String!
  }

  type CrmExcelInspectResult {
    headers: [String!]!
    "First few rows as JSON strings (for the mapping preview)."
    sample_rows: [String!]!
  }

  input CrmImportMappingInput {
    field: String!
    header: String!
  }

  input CrmChatMessageInput {
    role: String!
    content: String!
  }

  extend type Query {
    crmLeadConfig: CrmOptionGroup!
    venueLeads(filter: CrmLeadFilter): [VenueLead!]!
    "With near, only the leads within the radius, nearest first unless another sort is picked."
    venueLeadsTable(query: TableQueryInput, near: CrmLeadNearInput): VenueLeadTablePage!
    venueLead(id: ID!): VenueLead
    hostLeads(filter: CrmLeadFilter): [HostLead!]!
    "With near, only the leads within the radius, nearest first unless another sort is picked."
    hostLeadsTable(query: TableQueryInput, near: CrmLeadNearInput): HostLeadTablePage!
    hostLead(id: ID!): HostLead
    ecommLeads(filter: CrmLeadFilter): [EcommLead!]!
    "With near, only the leads within the radius, nearest first unless another sort is picked."
    ecommLeadsTable(query: TableQueryInput, near: CrmLeadNearInput): EcommLeadTablePage!
    ecommLead(id: ID!): EcommLead
    crmExcelTemplate(entity: CrmAiEntity!): CrmExcelFile!
    crmExcelExport(entity: CrmAiEntity!): CrmExcelFile!
    "Read an uploaded spreadsheet's headers + sample rows for column mapping."
    crmExcelInspect(content_base64: String!): CrmExcelInspectResult!
    crmServices(kind: CrmServiceKind, include_inactive: Boolean): [CrmService!]!
      @deprecated(reason: "Lead forms read crmServicesOffered (CRM › Data › Services Offered). Kept for older clients.")
    crmDynamicFields(entity: CrmEntityType, include_inactive: Boolean): [CrmDynamicField!]!
    "The configured Twilio caller-ID (From) number, shown on call dialogs."
    crmCallFromNumber: String
    "Which of these phone numbers, emails or website already belong to a lead of any kind (the lead forms' live duplicate check)."
    crmLeadDuplicates(input: CrmLeadDuplicateCheckInput!): [CrmLeadDuplicateMatch!]!
    "Active CRM team members matching a name / email search — the Assigned To picker and @mentions."
    crmAssignableUsers(search: String, limit: Int): [CrmStaffUser!]!
    "Names for the user ids a lead page shows (log authors, mentions, assignee), in one request."
    crmUsersByIds(ids: [ID!]!): [CrmStaffUser!]!
  }

  "The value a duplicate was found on."
  enum CrmDuplicateField {
    PHONE
    EMAIL
    WEBSITE
  }

  input CrmLeadDuplicateCheckInput {
    "The kind of the lead being edited — with lead_id, so it never matches itself."
    entity_type: CrmEntityType!
    "Set when editing an existing lead; blank for a new one."
    lead_id: ID
    contacts: [CrmContactInput!]
    website: String
  }

  "One typed value another lead already has, and which lead that is."
  type CrmLeadDuplicateMatch {
    field: CrmDuplicateField!
    "The value as it was typed."
    value: String!
    entity_type: CrmEntityType!
    lead_id: ID!
    lead_name: String!
    city: String!
    lead_status: String!
  }

  extend type Mutation {
    createCrmService(input: CrmServiceInput!): CrmService! @deprecated(reason: "Use the Services Offered catalogue mutations (createCrmServicesOffered etc.).")
    updateCrmService(id: ID!, input: CrmServiceInput!): CrmService! @deprecated(reason: "Use the Services Offered catalogue mutations (createCrmServicesOffered etc.).")
    deleteCrmService(id: ID!): Boolean! @deprecated(reason: "Use the Services Offered catalogue mutations (createCrmServicesOffered etc.).")
    createVenueLead(input: VenueLeadInput!): VenueLead!
    updateVenueLead(id: ID!, input: VenueLeadInput!): VenueLead!
    deleteVenueLead(id: ID!): Boolean!
    createHostLead(input: HostLeadInput!): HostLead!
    updateHostLead(id: ID!, input: HostLeadInput!): HostLead!
    deleteHostLead(id: ID!): Boolean!
    emailVenueLeadContact(
      id: ID!
      contact_email: String!
      subject: String!
      body: String!
      provider_id: ID
      attachments: [CrmEmailAssetInput!]
    ): LeadContactActionResult!
    callVenueLeadContact(id: ID!, contact_number: String!, provider_id: ID): LeadContactActionResult!
    emailHostLeadContact(
      id: ID!
      contact_email: String!
      subject: String!
      body: String!
      provider_id: ID
      attachments: [CrmEmailAssetInput!]
    ): LeadContactActionResult!
    callHostLeadContact(id: ID!, contact_number: String!, provider_id: ID): LeadContactActionResult!
    createEcommLead(input: EcommLeadInput!): EcommLead!
    updateEcommLead(id: ID!, input: EcommLeadInput!): EcommLead!
    deleteEcommLead(id: ID!): Boolean!
    emailEcommLeadContact(
      id: ID!
      contact_email: String!
      subject: String!
      body: String!
      provider_id: ID
      attachments: [CrmEmailAssetInput!]
    ): LeadContactActionResult!
    callEcommLeadContact(id: ID!, contact_number: String!, provider_id: ID): LeadContactActionResult!
    "Place an outbound AI call (Servam-driven) using a Static Content prompt and Servam voice."
    startCrmAiCall(
      "Older clients: venue, host or ecomm. Send entity_type instead, which covers every lead kind."
      entity: CrmAiEntity
      "The lead kind; wins over entity when both are sent."
      entity_type: CommsLogEntity
      id: ID!
      contact_number: String!
      prompt_id: ID!
      voice: String
      contact_name: String
    ): CrmAiCallResult!
    "Place a portal call: Twilio dials the lead, then rings the agent leg (agent_number, else the user's profile phone) into the same conference."
    startCrmPortalCall(
      "Older clients: venue, host or ecomm. Send entity_type instead, which covers every lead kind."
      entity: CrmAiEntity
      "The lead kind; wins over entity when both are sent."
      entity_type: CommsLogEntity
      id: ID!
      contact_number: String!
      agent_number: String
      contact_name: String
    ): CrmAiCallResult!
    "Re-sync a non-terminal call's status from Twilio (fallback when the async callback is missed)."
    reconcileCrmCall(log_id: ID!): CrmAiCallResult!
    aiParseCrmLead(entity: CrmAiEntity!, text: String!): String!
    "Extract multiple leads from text — returns JSON { records: [...] }."
    aiParseCrmLeads(entity: CrmAiEntity!, text: String!): String!
    "Chat about one lead, grounded in its CRM data + scraped website content. Returns HTML."
    crmLeadAiChat(entity: CrmAiEntity!, lead_id: ID!, messages: [CrmChatMessageInput!]!): String!
      @deprecated(reason: "Use askCrmLeadAi, which keeps the conversation and works for every lead kind.")
    crmExcelImport(entity: CrmAiEntity!, content_base64: String!, mapping: [CrmImportMappingInput!]): CrmExcelImportResult!
    addCrmManualLog(input: ManualLogInput!): CrmActivity!
    "Edit a manual log (its author, or a SUPER_ADMIN). Leaves a NOTE_UPDATED entry in the history."
    updateCrmManualLog(input: UpdateManualLogInput!): CrmActivity!
    "Delete a manual log (its author, or a SUPER_ADMIN). It stays in the history as deleted, without its words."
    deleteCrmManualLog(entity_type: CrmEntityType!, entity_id: ID!, log_id: ID!): CrmActivity!
    createCrmDynamicField(input: CrmDynamicFieldInput!): CrmDynamicField!
    updateCrmDynamicField(id: ID!, input: CrmDynamicFieldInput!): CrmDynamicField!
    deleteCrmDynamicField(id: ID!): Boolean!
    reorderCrmDynamicFields(ids: [ID!]!): [CrmDynamicField!]!
  }
`;
