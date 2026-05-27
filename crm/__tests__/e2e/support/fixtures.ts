/**
 * Centralised GraphQL response builders so every spec works from the same
 * baseline. Use as `cy.mockGraphql({ ...baseMocks(), MyOp: customResponse })`.
 */

export const adminUser = {
  __typename: 'User',
  user_id: 'u-admin',
  full_name: 'Admin Duncit',
  first_name: 'Admin',
  last_name: 'Duncit',
  email: 'admin@duncit.com',
  roles: ['SUPER_ADMIN', 'CRM_MANAGER'],
  profile_photo: '',
};

export const branding = {
  __typename: 'Branding',
  app_name: 'Duncit CRM',
  logo_url: '/duncit-logo.svg',
  primary_color: '#6366f1',
  support_email: 'admin@duncit.com',
};

export const superCategories = [
  { __typename: 'Category', id: 'cat-sports', name: 'Sports', slug: 'sports', icon: '', is_active: true, sort_order: 0 },
  { __typename: 'Category', id: 'cat-music', name: 'Music', slug: 'music', icon: '', is_active: true, sort_order: 1 },
];

export const venueServices = [
  { __typename: 'CrmService', id: 'svc-v1', name: 'Catering', kind: 'VENUE', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
  { __typename: 'CrmService', id: 'svc-v2', name: 'DJ / Music', kind: 'VENUE', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
];

export const hostServices = [
  { __typename: 'CrmService', id: 'svc-h1', name: 'Event Hosting', kind: 'HOST', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
];

export const crmLeadConfig = {
  __typename: 'CrmOptionGroup',
  venue_types: ['Banquet Hall', 'Cricket Ground', 'Other'],
  space_types: ['Indoor', 'Outdoor', 'Both'],
  venue_event_suitability: ['Wedding', 'Birthday'],
  week_days: ['Monday', 'Tuesday'],
  booking_notices: ['Instant', '24 hrs'],
  pricing_models: ['Hourly', 'Per Day'],
  amenities: ['Parking', 'AC'],
  lead_sources: ['Referral', 'Website'],
  venue_lead_statuses: ['New', 'Contacted', 'Won', 'Lost'],
  host_lead_statuses: ['New', 'Qualified', 'Won', 'Lost'],
  priorities: ['Low', 'Medium', 'High'],
  host_types: ['Individual', 'Community Admin', 'Other'],
  host_interests: ['Cricket / Sports'],
  audience_sizes: ['10-20', '20-50'],
  frequencies: ['One-time', 'Monthly'],
  revenue_models: ['Paid Tickets'],
  host_intent_scores: ['Looking for venue only'],
  services_offered_options: ['Catering', 'DJ / Music', 'Event Hosting', 'Other'],
  venue_services_offered_options: ['Catering', 'DJ / Music', 'Other'],
  host_services_offered_options: ['Event Hosting', 'Other'],
};

export const sampleVenueLead = {
  __typename: 'VenueLead',
  id: 'v-1',
  super_category_id: 'cat-sports',
  super_category: { __typename: 'CrmSuperCategoryRef', id: 'cat-sports', name: 'Sports', slug: 'sports', icon: '' },
  venue_name: 'Sample Arena',
  venue_types: ['Banquet Hall'],
  venue_description: 'A great venue',
  capacity_min: 50,
  capacity_max: 200,
  space_type: 'Indoor',
  city: 'Bengaluru',
  area: 'Indiranagar',
  full_address: '12 MG Rd',
  landmark: '',
  map_link: '',
  contacts: [
    {
      __typename: 'CrmContact',
      name: 'Asha',
      role: 'Owner',
      mobile_number: '9876543210',
      whatsapp_number: '',
      email: 'asha@example.com',
    },
  ],
  event_suitability: ['Wedding'],
  available_days: ['Monday'],
  available_time_slots: '9-5',
  booking_notice: 'Instant',
  pricing_models: ['Hourly'],
  expected_charges: 5000,
  security_deposit: 1000,
  gst_applicable: true,
  invoice_available: true,
  amenities: ['Parking'],
  photos: [],
  videos: [],
  brochure_url: '',
  website: 'https://arena.test',
  services_offered: [
    { __typename: 'CrmServiceOffered', service: 'Catering', custom_name: '', description: 'Veg + non-veg' },
  ],
  linked_host_ids: [],
  linked_hosts: [],
  tags: [],
  logo_url: '',
  dynamic_values_json: '{}',
  lead_source: 'Referral',
  assigned_to: 'PM',
  lead_status: 'New',
  priority: 'High',
  next_follow_up_date: null,
  remarks: '',
  activity_log: [],
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-20T00:00:00.000Z',
};

export const sampleHostLead = {
  __typename: 'HostLead',
  id: 'h-1',
  super_category_id: 'cat-sports',
  super_category: { __typename: 'CrmSuperCategoryRef', id: 'cat-sports', name: 'Sports', slug: 'sports', icon: '' },
  host_name: 'Sample Host',
  host_type: 'Individual',
  organization_name: '',
  city: 'Bengaluru',
  area: '',
  contacts: [
    {
      __typename: 'CrmContact',
      name: 'Ravi',
      role: 'Organizer',
      mobile_number: '9811122233',
      whatsapp_number: '',
      email: 'ravi@example.com',
    },
  ],
  interests: ['Cricket / Sports'],
  expected_audience_size: '10-20',
  frequency: 'One-time',
  budget_range: '',
  revenue_models: [],
  need_venue: true,
  need_vendor: false,
  preferred_event_date: null,
  preferred_day: '',
  preferred_time_slot: '',
  website: '',
  services_offered: [],
  instagram_link: '',
  community_link: '',
  community_size: null,
  previous_events_hosted: false,
  past_attendees: null,
  host_intent_scores: [],
  tags: [],
  profile_photo_url: '',
  dynamic_values_json: '{}',
  lead_source: '',
  assigned_to: '',
  lead_status: 'New',
  priority: 'Medium',
  next_follow_up_date: null,
  notes: '',
  activity_log: [],
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-20T00:00:00.000Z',
};

/**
 * Baseline mocks every authenticated test needs. Most important: `SessionMe`
 * — when missing, the user-context provider treats the session as broken and
 * pops a global "We couldn't load your account" recovery Dialog that covers
 * every other element on the page. `AppBranding` is similarly needed by the
 * shell sidebar's logo loader.
 */
export const baseMocks = () => ({
  SessionMe: { data: { me: adminUser } },
  AppBranding: { data: { branding } },
  CrmLeadConfig: { data: { crmLeadConfig } },
  SuperCategories: { data: { categories: superCategories } },
  VenueLeads: { data: { venueLeads: [sampleVenueLead] } },
  HostLeads: { data: { hostLeads: [sampleHostLead] } },
  VenueLead: { data: { venueLead: sampleVenueLead } },
  HostLead: { data: { hostLead: sampleHostLead } },
});

export const loginSuccess = {
  data: {
    login: {
      __typename: 'LoginPayload',
      token: 'cypress-test-token',
      user: adminUser,
    },
  },
};

export const loginInvalid = {
  errors: [
    { message: 'Invalid email or password', extensions: { code: 'UNAUTHENTICATED' } },
  ],
};
