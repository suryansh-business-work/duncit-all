import type { CrmContact, CrmServiceOffered, CrmSocialLink } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';

/** Fields every creator and community lead form has. Numbers are edited as strings. */
export interface ProspectBackboneValues {
  super_category_id: string;
  city: string;
  area: string;
  contacts: CrmContact[];
  website: string;
  instagram_link: string;
  social_links: CrmSocialLink[];
  services_offered: CrmServiceOffered[];
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

export interface CreatorLeadFormValues extends ProspectBackboneValues {
  creator_name: string;
  handle: string;
  primary_platform: string;
  niches: string[];
  followers_count: string;
  engagement_rate: string;
  profile_links: string[];
  collaboration_types: string[];
  rate_card: string;
}

export interface CommunityLeadFormValues extends ProspectBackboneValues {
  community_name: string;
  community_type: string;
  platform: string;
  member_count: string;
  meetup_frequency: string;
  community_link: string;
  interests: string[];
  partnership_interests: string[];
}

export type ProspectLeadFormValues = CreatorLeadFormValues | CommunityLeadFormValues;

const backboneInitialValues: ProspectBackboneValues = {
  super_category_id: '',
  city: '',
  area: '',
  contacts: [{ ...emptyContact }],
  website: '',
  instagram_link: '',
  social_links: [],
  services_offered: [],
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

export const creatorLeadInitialValues: CreatorLeadFormValues = {
  ...backboneInitialValues,
  creator_name: '',
  handle: '',
  primary_platform: '',
  niches: [],
  followers_count: '',
  engagement_rate: '',
  profile_links: [],
  collaboration_types: [],
  rate_card: '',
};

export const communityLeadInitialValues: CommunityLeadFormValues = {
  ...backboneInitialValues,
  community_name: '',
  community_type: '',
  platform: '',
  member_count: '',
  meetup_frequency: '',
  community_link: '',
  interests: [],
  partnership_interests: [],
};
