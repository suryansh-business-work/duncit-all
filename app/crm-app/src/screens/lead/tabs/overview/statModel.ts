import { CRM_DASH, crmFormatCapacity, crmFormatCount, crmServicesHint } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import { displayDate } from '../parts/dates';
import type { StatTileItem } from '../parts/StatTiles';
import type {
  CardLead,
  CommunityOverview,
  CreatorOverview,
  EcommOverview,
  HostOverview,
  KindOverview,
  VenueOverview,
} from './overviewTypes';

type Services = VenueOverview['services_offered'];

function servicesTile(services: Services, t: Translate): StatTileItem {
  return {
    key: 'services',
    label: t('crm.common.services'),
    value: String(services.length),
    hint: crmServicesHint(services) || t('crm.leadDetail.noneTagged'),
    icon: 'handyman',
    tone: 'accentText',
  };
}

function followUpTile(lead: CardLead, t: Translate): StatTileItem {
  return {
    key: 'follow-up',
    label: t('crm.common.nextFollowUp'),
    value: displayDate(lead.next_follow_up_date) || CRM_DASH,
    hint: lead.assigned_to
      ? t('crm.prospectLeads.assignedTo', { vars: { name: lead.assigned_to } })
      : t('crm.prospectLeads.unassigned'),
    icon: 'event-available',
    tone: 'warning',
  };
}

function venueTiles(data: VenueOverview, t: Translate): StatTileItem[] {
  const charges = data.expected_charges;
  const deposit = data.security_deposit;
  return [
    {
      key: 'capacity',
      label: t('crm.venueLeads.capacity'),
      value: crmFormatCapacity(data.capacity_min, data.capacity_max),
      hint: data.space_type || t('crm.leadDetail.spaceNotSet'),
      icon: 'groups',
      tone: 'accentText',
    },
    servicesTile(data.services_offered, t),
    {
      key: 'charges',
      label: t('crm.venueLeads.expectedCharges'),
      value: charges
        ? t('crm.leadDetail.amount', { vars: { amount: charges.toLocaleString() } })
        : CRM_DASH,
      hint: deposit
        ? t('crm.leadDetail.deposit', { vars: { amount: deposit.toLocaleString() } })
        : t('crm.leadDetail.noDeposit'),
      icon: 'currency-rupee',
      tone: 'success',
    },
  ];
}

function hostTiles(data: HostOverview, t: Translate): StatTileItem[] {
  return [
    {
      key: 'audience',
      label: t('crm.hostLeads.audience'),
      value: data.expected_audience_size || CRM_DASH,
      hint: data.frequency || t('crm.leadDetail.frequencyNotSet'),
      icon: 'groups',
      tone: 'info',
    },
    servicesTile(data.services_offered, t),
    {
      key: 'community',
      label: t('crm.common.community'),
      value: data.community_size == null ? CRM_DASH : String(data.community_size),
      hint: data.previous_events_hosted
        ? t('crm.leadDetail.pastEvents', { vars: { attendees: data.past_attendees ?? CRM_DASH } })
        : t('crm.leadDetail.noPastEvents'),
      icon: 'event',
      tone: 'accentText',
    },
  ];
}

function ecommTiles(data: EcommOverview, t: Translate): StatTileItem[] {
  return [
    {
      key: 'catalogue',
      label: t('crm.ecommLeads.catalogue'),
      value: data.catalog_size || CRM_DASH,
      hint: data.price_range
        ? t('crm.leadDetail.priceRange', { vars: { range: data.price_range } })
        : t('crm.leadDetail.priceRangeNotSet'),
      icon: 'inventory-2',
      tone: 'info',
    },
    servicesTile(data.services_offered, t),
    {
      key: 'orders',
      label: t('crm.ecommLeads.monthlyOrders'),
      value: data.monthly_orders || CRM_DASH,
      hint: data.fulfilment_mode
        ? t('crm.leadDetail.fulfilment', { vars: { mode: data.fulfilment_mode } })
        : t('crm.leadDetail.fulfilmentNotSet'),
      icon: 'shopping-cart',
      tone: 'accentText',
    },
  ];
}

function creatorTiles(data: CreatorOverview, t: Translate): StatTileItem[] {
  return [
    {
      key: 'reach',
      label: t('crm.creatorLeads.followers'),
      value: crmFormatCount(data.followers_count),
      hint: data.primary_platform || t('crm.creatorLeads.platformNotSet'),
      icon: 'trending-up',
      tone: 'info',
    },
    {
      key: 'collab',
      label: t('crm.creatorLeads.collaborationTypes'),
      value: String(data.collaboration_types.length),
      hint: data.collaboration_types.slice(0, 2).join(', ') || t('crm.creatorLeads.noneSelected'),
      icon: 'handshake',
      tone: 'accentText',
    },
  ];
}

function communityTiles(data: CommunityOverview, t: Translate): StatTileItem[] {
  return [
    {
      key: 'members',
      label: t('crm.communityLeads.members'),
      value: crmFormatCount(data.member_count),
      hint: data.platform || t('crm.communityLeads.platformNotSet'),
      icon: 'groups',
      tone: 'info',
    },
    {
      key: 'meetups',
      label: t('crm.communityLeads.meetupFrequency'),
      value: data.meetup_frequency || CRM_DASH,
      hint: data.interests.slice(0, 2).join(', ') || t('crm.communityLeads.noInterests'),
      icon: data.meetup_frequency ? 'event-repeat' : 'interests',
      tone: 'accentText',
    },
  ];
}

/** The stat tiles under each kind's hero, ending with the next follow-up and who owns the lead. */
export function statModel(overview: KindOverview, lead: CardLead, t: Translate): StatTileItem[] {
  return [...kindTiles(overview, t), followUpTile(lead, t)];
}

function kindTiles(overview: KindOverview, t: Translate): StatTileItem[] {
  switch (overview.kind) {
    case 'VENUE_LEAD':
      return venueTiles(overview.data, t);
    case 'HOST_LEAD':
      return hostTiles(overview.data, t);
    case 'ECOMM_LEAD':
      return ecommTiles(overview.data, t);
    case 'CREATOR_LEAD':
      return creatorTiles(overview.data, t);
    default:
      return communityTiles(overview.data, t);
  }
}
