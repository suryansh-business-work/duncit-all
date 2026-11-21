import type { CrmContact } from '../../api/crm.types';
import type { CommunityLead, CreatorLead, ProspectLeadBase } from '../../api/prospectLeads.types';
import { emptyContact } from '../fields/ContactsField';
import {
  communityLeadInitialValues,
  creatorLeadInitialValues,
  type CommunityLeadFormValues,
  type CreatorLeadFormValues,
  type ProspectBackboneValues,
} from './prospect-lead.types';

const cleanList = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

const cleanContacts = (contacts: CrmContact[]) =>
  contacts
    .filter((c) => c.name || c.mobile_number || c.email || c.whatsapp_number)
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      mobile_number: c.mobile_number.trim(),
      whatsapp_number: c.whatsapp_number.trim(),
      email: c.email.trim(),
    }));

/** Blank → null; anything else → a number (the schema has already validated it). */
export const toNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

export const numberToText = (value?: number | null): string =>
  value === null || value === undefined ? '' : String(value);

function backboneInput(v: ProspectBackboneValues) {
  return {
    super_category_id: v.super_category_id.trim() || null,
    city: v.city.trim(),
    area: v.area.trim(),
    contacts: cleanContacts(v.contacts),
    website: v.website.trim(),
    instagram_link: v.instagram_link.trim(),
    tags: cleanList(v.tags),
    profile_photo_url: v.profile_photo_url.trim(),
    dynamic_values_json: v.dynamic_values_json || '{}',
    lead_source: v.lead_source,
    assigned_to: v.assigned_to.trim(),
    lead_status: v.lead_status,
    priority: v.priority,
    next_follow_up_date: v.next_follow_up_date ? v.next_follow_up_date.toISOString() : null,
    notes: v.notes.trim(),
  };
}

function backboneValues(lead: ProspectLeadBase): ProspectBackboneValues {
  return {
    super_category_id: lead.super_category_id ?? '',
    city: lead.city ?? '',
    area: lead.area ?? '',
    contacts: lead.contacts?.length ? lead.contacts.map((c) => ({ ...emptyContact, ...c })) : [{ ...emptyContact }],
    website: lead.website ?? '',
    instagram_link: lead.instagram_link ?? '',
    tags: lead.tags ?? [],
    profile_photo_url: lead.profile_photo_url ?? '',
    dynamic_values_json: lead.dynamic_values_json || '{}',
    lead_source: lead.lead_source ?? '',
    assigned_to: lead.assigned_to ?? '',
    lead_status: lead.lead_status,
    priority: lead.priority,
    next_follow_up_date: lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null,
    notes: lead.notes ?? '',
  };
}

/** Form values → GraphQL CreatorLeadInput. */
export function toCreatorLeadInput(v: CreatorLeadFormValues) {
  return {
    ...backboneInput(v),
    creator_name: v.creator_name.trim(),
    handle: v.handle.trim(),
    primary_platform: v.primary_platform,
    niches: cleanList(v.niches),
    followers_count: toNumber(v.followers_count),
    engagement_rate: toNumber(v.engagement_rate),
    profile_links: cleanList(v.profile_links),
    collaboration_types: cleanList(v.collaboration_types),
    rate_card: v.rate_card.trim(),
  };
}

/** Existing CreatorLead → editable form values. */
export function fromCreatorLead(lead: CreatorLead): CreatorLeadFormValues {
  return {
    ...creatorLeadInitialValues,
    ...backboneValues(lead),
    creator_name: lead.creator_name,
    handle: lead.handle ?? '',
    primary_platform: lead.primary_platform ?? '',
    niches: lead.niches ?? [],
    followers_count: numberToText(lead.followers_count),
    engagement_rate: numberToText(lead.engagement_rate),
    profile_links: lead.profile_links ?? [],
    collaboration_types: lead.collaboration_types ?? [],
    rate_card: lead.rate_card ?? '',
  };
}

/** Form values → GraphQL CommunityLeadInput. */
export function toCommunityLeadInput(v: CommunityLeadFormValues) {
  return {
    ...backboneInput(v),
    community_name: v.community_name.trim(),
    community_type: v.community_type,
    platform: v.platform,
    member_count: toNumber(v.member_count),
    meetup_frequency: v.meetup_frequency,
    community_link: v.community_link.trim(),
    interests: cleanList(v.interests),
    partnership_interests: cleanList(v.partnership_interests),
  };
}

/** Existing CommunityLead → editable form values. */
export function fromCommunityLead(lead: CommunityLead): CommunityLeadFormValues {
  return {
    ...communityLeadInitialValues,
    ...backboneValues(lead),
    community_name: lead.community_name,
    community_type: lead.community_type ?? '',
    platform: lead.platform ?? '',
    member_count: numberToText(lead.member_count),
    meetup_frequency: lead.meetup_frequency ?? '',
    community_link: lead.community_link ?? '',
    interests: lead.interests ?? [],
    partnership_interests: lead.partnership_interests ?? [],
  };
}
