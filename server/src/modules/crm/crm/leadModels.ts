import { VenueLeadModel, HostLeadModel, EcommLeadModel } from './crm.model';
import { CreatorLeadModel, CommunityLeadModel } from '@modules/crm/prospectLead/prospectLead.model';

/**
 * Lead model + human label per CRM entity type (manual logs, comms activity,
 * lead media). Its own module so the manual-log and assignee modules can read
 * it without importing crm.service (which imports them back).
 */
export const LEAD_MODELS = {
  VENUE_LEAD: VenueLeadModel,
  HOST_LEAD: HostLeadModel,
  ECOMM_LEAD: EcommLeadModel,
  CREATOR_LEAD: CreatorLeadModel,
  COMMUNITY_LEAD: CommunityLeadModel,
} as const;

/** The required field that names a lead of each kind. */
export const LEAD_NAME_FIELDS = {
  VENUE_LEAD: 'venue_name',
  HOST_LEAD: 'host_name',
  ECOMM_LEAD: 'seller_name',
  CREATOR_LEAD: 'creator_name',
  COMMUNITY_LEAD: 'community_name',
} as const;

export const LEAD_LABELS = {
  VENUE_LEAD: 'Venue lead',
  HOST_LEAD: 'Host lead',
  ECOMM_LEAD: 'Ecomm lead',
  CREATOR_LEAD: 'Creator lead',
  COMMUNITY_LEAD: 'Community lead',
} as const;
