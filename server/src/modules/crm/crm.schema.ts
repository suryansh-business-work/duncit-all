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

  type CrmActivity {
    type: String!
    summary: String
    status: String
    target: String
    created_by: String
    created_at: String
  }

  type VenueLead {
    id: ID!
    venue_name: String!
    venue_types: [String!]!
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
    instagram_link: String
    community_link: String
    community_size: Int
    previous_events_hosted: Boolean!
    past_attendees: Int
    host_intent_scores: [String!]!
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
  }

  input VenueLeadInput {
    venue_name: String!
    venue_types: [String!]
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
    lead_source: String
    assigned_to: String
    lead_status: String
    priority: String
    next_follow_up_date: String
    remarks: String
  }

  input HostLeadInput {
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
    instagram_link: String
    community_link: String
    community_size: Int
    previous_events_hosted: Boolean
    past_attendees: Int
    host_intent_scores: [String!]
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
  }

  type VobizActionResult {
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
  }

  extend type Mutation {
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
    ): VobizActionResult!
    callVenueLeadContact(id: ID!, contact_number: String!, provider_id: ID): VobizActionResult!
    emailHostLeadContact(
      id: ID!
      contact_email: String!
      subject: String!
      body: String!
      provider_id: ID
    ): VobizActionResult!
    callHostLeadContact(id: ID!, contact_number: String!, provider_id: ID): VobizActionResult!
    aiParseCrmLead(entity: CrmAiEntity!, text: String!): String!
    crmExcelImport(entity: CrmAiEntity!, content_base64: String!): CrmExcelImportResult!
  }
`;
