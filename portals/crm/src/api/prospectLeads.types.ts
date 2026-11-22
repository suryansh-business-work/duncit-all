import type { CrmActivity, CrmContact, CrmServiceOffered, CrmSocialLink, CrmSuperCategoryRef } from './crm.types';

/** Fields every creator and community lead has (mirrors the server lead backbone). */
export interface ProspectLeadBase {
  id: string;
  super_category_id?: string | null;
  super_category?: CrmSuperCategoryRef | null;
  city?: string | null;
  area?: string | null;
  contacts: CrmContact[];
  website?: string | null;
  instagram_link?: string | null;
  social_links: CrmSocialLink[];
  services_offered: CrmServiceOffered[];
  tags: string[];
  profile_photo_url?: string | null;
  /** JSON-stringified `CrmDynamicValueMap` — parse with JSON.parse before use. */
  dynamic_values_json: string;
  lead_source?: string | null;
  assigned_to?: string | null;
  assigned_user_id?: string | null;
  lead_status: string;
  priority: string;
  next_follow_up_date?: string | null;
  notes?: string | null;
  activity_log: CrmActivity[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreatorLead extends ProspectLeadBase {
  creator_name: string;
  handle?: string | null;
  primary_platform?: string | null;
  niches: string[];
  followers_count?: number | null;
  /** Average engagement, in percent. */
  engagement_rate?: number | null;
  profile_links: string[];
  collaboration_types: string[];
  rate_card?: string | null;
}

export interface CommunityLead extends ProspectLeadBase {
  community_name: string;
  community_type?: string | null;
  platform?: string | null;
  member_count?: number | null;
  meetup_frequency?: string | null;
  community_link?: string | null;
  interests: string[];
  partnership_interests: string[];
}

export type ProspectLead = CreatorLead | CommunityLead;
