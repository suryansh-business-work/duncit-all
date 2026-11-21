import type { CrmLeadEntityType } from '../api/crm.types';

/** Each lead kind's name as copy ("Venue lead"). */
export const LEAD_KIND_LABEL_KEY: Record<CrmLeadEntityType, string> = {
  VENUE_LEAD: 'crm.calendar.venueLead',
  HOST_LEAD: 'crm.calendar.hostLead',
  ECOMM_LEAD: 'crm.calendar.ecommLead',
  CREATOR_LEAD: 'crm.calendar.creatorLead',
  COMMUNITY_LEAD: 'crm.calendar.communityLead',
};

/** Each lead kind's list route; a lead's detail page is `${path}/${id}/view`. */
export const LEAD_PATH: Record<CrmLeadEntityType, string> = {
  VENUE_LEAD: '/venue-leads',
  HOST_LEAD: '/host-leads',
  ECOMM_LEAD: '/ecomm-leads',
  CREATOR_LEAD: '/creator-leads',
  COMMUNITY_LEAD: '/community-leads',
};

export const leadDetailPath = (entity: CrmLeadEntityType, id: string): string => `${LEAD_PATH[entity]}/${id}/view`;
