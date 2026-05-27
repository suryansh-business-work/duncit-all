import type { CrmContact, CrmServiceOffered } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';

export interface HostLeadFormValues {
  super_category_id: string;
  host_name: string;
  host_type: string;
  organization_name: string;
  city: string;
  area: string;
  contacts: CrmContact[];
  interests: string[];
  expected_audience_size: string;
  frequency: string;
  budget_range: string;
  revenue_models: string[];
  need_venue: boolean;
  need_vendor: boolean;
  preferred_event_date: Date | null;
  preferred_day: string;
  preferred_time_slot: string;
  website: string;
  services_offered: CrmServiceOffered[];
  instagram_link: string;
  community_link: string;
  community_size: string;
  previous_events_hosted: boolean;
  past_attendees: string;
  host_intent_scores: string[];
  tags: string[];
  profile_photo_url: string;
  dynamic_values_json: string;
  lead_source: string;
  assigned_to: string;
  lead_status: string;
  priority: string;
  next_follow_up_date: Date | null;
  notes: string;
}

export const hostLeadInitialValues: HostLeadFormValues = {
  super_category_id: '',
  host_name: '',
  host_type: '',
  organization_name: '',
  city: '',
  area: '',
  contacts: [{ ...emptyContact }],
  interests: [],
  expected_audience_size: '',
  frequency: '',
  budget_range: '',
  revenue_models: [],
  need_venue: false,
  need_vendor: false,
  preferred_event_date: null,
  preferred_day: '',
  preferred_time_slot: '',
  website: '',
  services_offered: [],
  instagram_link: '',
  community_link: '',
  community_size: '',
  previous_events_hosted: false,
  past_attendees: '',
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
};
