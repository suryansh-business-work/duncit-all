// Shared, strongly-typed shapes for CRM leads — mirrors the server `crm` module.
export interface CrmContact {
  name: string;
  role: string;
  mobile_number: string;
  whatsapp_number: string;
  email: string;
}

export interface CrmServiceOffered {
  service: string;
  custom_name?: string | null;
  description?: string | null;
}

export type CrmServiceKind = 'VENUE' | 'HOST' | 'ECOMM';

export interface CrmService {
  id: string;
  name: string;
  kind: CrmServiceKind;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CrmSuperCategoryRef {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface SuperCategoryOption {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface CrmActivity {
  type: string;
  summary?: string | null;
  status?: string | null;
  target?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface CrmLinkedHost {
  id: string;
  host_name: string;
  host_type?: string | null;
  city?: string | null;
  lead_status: string;
  priority: string;
}

export type CrmDynamicFieldKind = 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';

export interface CrmDynamicFieldOption {
  value: string;
  label: string;
}

export interface CrmDynamicField {
  id: string;
  name: string;
  label: string;
  kind: CrmDynamicFieldKind;
  options: CrmDynamicFieldOption[];
  multi: boolean;
  placeholder: string;
  default_value: string;
  hint: string;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  applies_to_ecomm: boolean;
  required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export type CrmDynamicValueMap = Record<string, string | number | boolean | string[] | null>;

export interface CrmMatchedUser {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_photo?: string | null;
  matched_on: 'EMAIL' | 'PHONE';
}

export interface VenueLead {
  id: string;
  super_category_id?: string | null;
  category_ids?: string[];
  sub_category_ids?: string[];
  super_category?: CrmSuperCategoryRef | null;
  matched_user?: CrmMatchedUser | null;
  venue_name: string;
  venue_types: string[];
  venue_type_other?: string | null;
  venue_description?: string | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
  space_type?: string | null;
  city: string;
  area?: string | null;
  full_address: string;
  landmark?: string | null;
  map_link?: string | null;
  contacts: CrmContact[];
  event_suitability: string[];
  available_days: string[];
  available_time_slots?: string | null;
  booking_notice?: string | null;
  pricing_models: string[];
  expected_charges?: number | null;
  security_deposit?: number | null;
  gst_applicable: boolean;
  invoice_available: boolean;
  amenities: string[];
  photos: string[];
  videos: string[];
  brochure_url?: string | null;
  website?: string | null;
  services_offered: CrmServiceOffered[];
  linked_host_ids: string[];
  linked_hosts: CrmLinkedHost[];
  tags: string[];
  logo_url?: string | null;
  /** JSON-stringified `CrmDynamicValueMap` — parse with JSON.parse before use. */
  dynamic_values_json: string;
  lead_source?: string | null;
  assigned_to?: string | null;
  lead_status: string;
  priority: string;
  next_follow_up_date?: string | null;
  remarks?: string | null;
  activity_log: CrmActivity[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HostLead {
  id: string;
  super_category_id?: string | null;
  category_ids?: string[];
  sub_category_ids?: string[];
  super_category?: CrmSuperCategoryRef | null;
  matched_user?: CrmMatchedUser | null;
  host_name: string;
  host_type?: string | null;
  organization_name?: string | null;
  city?: string | null;
  area?: string | null;
  contacts: CrmContact[];
  interests: string[];
  expected_audience_size?: string | null;
  frequency?: string | null;
  budget_range?: string | null;
  revenue_models: string[];
  need_venue: boolean;
  need_vendor: boolean;
  preferred_event_date?: string | null;
  preferred_day?: string | null;
  preferred_time_slot?: string | null;
  website?: string | null;
  services_offered: CrmServiceOffered[];
  instagram_link?: string | null;
  community_link?: string | null;
  community_size?: number | null;
  previous_events_hosted: boolean;
  past_attendees?: number | null;
  host_intent_scores: string[];
  tags: string[];
  profile_photo_url?: string | null;
  dynamic_values_json: string;
  lead_source?: string | null;
  assigned_to?: string | null;
  lead_status: string;
  priority: string;
  next_follow_up_date?: string | null;
  notes?: string | null;
  activity_log: CrmActivity[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EcommLead {
  id: string;
  super_category_id?: string | null;
  category_ids?: string[];
  sub_category_ids?: string[];
  super_category?: CrmSuperCategoryRef | null;
  matched_user?: CrmMatchedUser | null;
  seller_name: string;
  brand_name?: string | null;
  business_type?: string | null;
  city?: string | null;
  area?: string | null;
  contacts: CrmContact[];
  product_categories: string[];
  catalog_size?: string | null;
  price_range?: string | null;
  fulfilment_mode?: string | null;
  monthly_orders?: string | null;
  gst_number?: string | null;
  gst_applicable: boolean;
  website?: string | null;
  instagram_link?: string | null;
  marketplace_links: string[];
  services_offered: CrmServiceOffered[];
  tags: string[];
  profile_photo_url?: string | null;
  dynamic_values_json: string;
  lead_source?: string | null;
  assigned_to?: string | null;
  lead_status: string;
  priority: string;
  next_follow_up_date?: string | null;
  notes?: string | null;
  activity_log: CrmActivity[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CrmOptionGroup {
  venue_types: string[];
  space_types: string[];
  venue_event_suitability: string[];
  week_days: string[];
  booking_notices: string[];
  pricing_models: string[];
  amenities: string[];
  lead_sources: string[];
  venue_lead_statuses: string[];
  host_lead_statuses: string[];
  priorities: string[];
  host_types: string[];
  host_interests: string[];
  audience_sizes: string[];
  frequencies: string[];
  revenue_models: string[];
  host_intent_scores: string[];
  services_offered_options: string[];
  venue_services_offered_options: string[];
  host_services_offered_options: string[];
}
