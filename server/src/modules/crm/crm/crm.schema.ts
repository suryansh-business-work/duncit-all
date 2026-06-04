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
    type: String!
    summary: String
    status: String
    target: String
    body_html: String
    body_text: String
    created_by: String
    created_at: String
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
    required: Boolean
    sort_order: Int
    is_active: Boolean
  }

  input ManualLogInput {
    entity_type: CrmEntityType!
    entity_id: ID!
    summary: String
    body_html: String!
    body_text: String
  }

  enum CrmServiceKind {
    VENUE
    HOST
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

  type VenueLead {
    id: ID!
    super_category_id: ID
    category_ids: [ID!]!
    sub_category_ids: [ID!]!
    super_category: CrmSuperCategoryRef
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
    linked_host_ids: [ID!]!
    linked_hosts: [CrmLinkedHost!]!
    tags: [String!]!
    logo_url: String
    "Stringified JSON map of dynamic field values. Empty object when none set."
    dynamic_values_json: String!
    lead_source: String
    assigned_to: String
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    remarks: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
  }

  type HostLead {
    id: ID!
    super_category_id: ID
    category_ids: [ID!]!
    sub_category_ids: [ID!]!
    super_category: CrmSuperCategoryRef
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
    assigned_to: String
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
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
    linked_host_ids: [ID!]
    tags: [String!]
    logo_url: String
    dynamic_values_json: String
    lead_source: String
    assigned_to: String
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
    assigned_to: String
    lead_status: String
    priority: String
    next_follow_up_date: String
    notes: String
  }

  input CrmLeadFilter {
    search: String
    city: String
    lead_status: String
    priority: String
    super_category_id: ID
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
  }

  "Result of placing a CRM call (AI or portal/agent-bridge)."
  type CrmAiCallResult {
    ok: Boolean!
    message: String!
    log_id: ID
    external_id: String
    status: String
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

  extend type Query {
    crmLeadConfig: CrmOptionGroup!
    venueLeads(filter: CrmLeadFilter): [VenueLead!]!
    venueLead(id: ID!): VenueLead
    hostLeads(filter: CrmLeadFilter): [HostLead!]!
    hostLead(id: ID!): HostLead
    crmExcelTemplate(entity: CrmAiEntity!): CrmExcelFile!
    crmExcelExport(entity: CrmAiEntity!): CrmExcelFile!
    crmServices(kind: CrmServiceKind, include_inactive: Boolean): [CrmService!]!
    crmDynamicFields(entity: CrmEntityType, include_inactive: Boolean): [CrmDynamicField!]!
    "The configured Twilio caller-ID (From) number, shown on call dialogs."
    crmCallFromNumber: String
  }

  extend type Mutation {
    createCrmService(input: CrmServiceInput!): CrmService!
    updateCrmService(id: ID!, input: CrmServiceInput!): CrmService!
    deleteCrmService(id: ID!): Boolean!
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
    ): LeadContactActionResult!
    callVenueLeadContact(id: ID!, contact_number: String!, provider_id: ID): LeadContactActionResult!
    emailHostLeadContact(
      id: ID!
      contact_email: String!
      subject: String!
      body: String!
      provider_id: ID
    ): LeadContactActionResult!
    callHostLeadContact(id: ID!, contact_number: String!, provider_id: ID): LeadContactActionResult!
    "Place an outbound AI call (Servam-driven) using a Static Content prompt and Servam voice."
    startCrmAiCall(
      entity: CrmAiEntity!
      id: ID!
      contact_number: String!
      prompt_id: ID!
      voice: String
      contact_name: String
    ): CrmAiCallResult!
    "Place a portal call: Twilio rings the agent leg (agent_number, else the user's profile phone), then bridges to the customer."
    startCrmPortalCall(
      entity: CrmAiEntity!
      id: ID!
      contact_number: String!
      agent_number: String
      contact_name: String
    ): CrmAiCallResult!
    "Re-sync a non-terminal call's status from Twilio (fallback when the async callback is missed)."
    reconcileCrmCall(log_id: ID!): CrmAiCallResult!
    aiParseCrmLead(entity: CrmAiEntity!, text: String!): String!
    crmExcelImport(entity: CrmAiEntity!, content_base64: String!): CrmExcelImportResult!
    addCrmManualLog(input: ManualLogInput!): CrmActivity!
    createCrmDynamicField(input: CrmDynamicFieldInput!): CrmDynamicField!
    updateCrmDynamicField(id: ID!, input: CrmDynamicFieldInput!): CrmDynamicField!
    deleteCrmDynamicField(id: ID!): Boolean!
    reorderCrmDynamicFields(ids: [ID!]!): [CrmDynamicField!]!
  }
`;
