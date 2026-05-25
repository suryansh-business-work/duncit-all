import type { CrmContact } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';

export interface HostLeadFormValues {
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
  instagram_link: string;
  community_link: string;
  community_size: string;
  previous_events_hosted: boolean;
  past_attendees: string;
  host_intent_scores: string[];
  lead_source: string;
  assigned_to: string;
  lead_status: string;
  priority: string;
  next_follow_up_date: Date | null;
  notes: string;
}

export const hostLeadInitialValues: HostLeadFormValues = {
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
  instagram_link: '',
  community_link: '',
  community_size: '',
  previous_events_hosted: false,
  past_attendees: '',
  host_intent_scores: [],
  lead_source: '',
  assigned_to: '',
  lead_status: 'New',
  priority: 'Medium',
  next_follow_up_date: null,
  notes: '',
};
