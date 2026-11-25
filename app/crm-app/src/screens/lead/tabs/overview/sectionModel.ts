import {
  CRM_DASH,
  crmFormatCapacity,
  crmFormatCount,
  crmJoinList,
  crmMapsUrl,
} from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import type { RowValue } from '../parts/DetailRow';
import type {
  CardLead,
  CommunityOverview,
  CreatorOverview,
  EcommOverview,
  HostOverview,
  KindOverview,
  SectionModel,
  VenueOverview,
} from './overviewTypes';

const link = (href: string | null | undefined): RowValue => (href ? { href } : CRM_DASH);

function location(lead: CardLead, area: string | null | undefined, t: Translate): SectionModel {
  return {
    key: 'location',
    title: t('crm.common.location'),
    icon: 'location-on',
    rows: [
      { label: t('crm.common.city'), value: lead.city },
      { label: t('crm.common.area'), value: area },
    ],
  };
}

function venueSections(data: VenueOverview, lead: CardLead, t: Translate): SectionModel[] {
  const place = location(lead, data.area, t);
  const address = [data.full_address, data.area, lead.city].filter(Boolean).join(', ');
  return [
    {
      key: 'details',
      title: t('crm.venueLeads.venueDetails'),
      icon: 'home-work',
      rows: [
        { label: t('crm.common.superCategory2'), value: data.super_category?.name },
        { label: t('crm.venueLeads.types'), value: crmJoinList(data.venue_types) },
        { label: t('crm.venueLeads.space'), value: data.space_type },
        {
          label: t('crm.venueLeads.capacity'),
          value: crmFormatCapacity(data.capacity_min, data.capacity_max),
        },
        { label: t('shell.common.description'), value: data.venue_description },
      ],
    },
    {
      ...place,
      rows: [
        ...place.rows,
        { label: t('crm.common.address'), value: data.full_address },
        { label: t('crm.common.landmark'), value: data.landmark },
      ],
      map: { url: crmMapsUrl(address, data.map_link) },
    },
    {
      key: 'availability',
      title: t('crm.venueLeads.availabilityAndSuitability'),
      icon: 'event',
      rows: [
        { label: t('crm.venueLeads.days'), value: crmJoinList(data.available_days) },
        { label: t('crm.venueLeads.timeSlots'), value: data.available_time_slots },
        { label: t('crm.venueLeads.bookingNotice'), value: data.booking_notice },
        { label: t('crm.venueLeads.suitableFor'), value: crmJoinList(data.event_suitability) },
        { label: t('crm.venueLeads.amenities'), value: crmJoinList(data.amenities) },
      ],
    },
  ];
}

function hostSections(data: HostOverview, lead: CardLead, t: Translate): SectionModel[] {
  return [
    {
      key: 'details',
      title: t('crm.hostLeads.hostDetails'),
      icon: 'groups',
      rows: [
        { label: t('crm.common.superCategory2'), value: data.super_category?.name },
        { label: t('shell.common.type'), value: data.host_type },
        { label: t('crm.hostLeads.organization'), value: data.organization_name },
        { label: t('crm.hostLeads.interests'), value: crmJoinList(data.interests) },
        { label: t('crm.hostLeads.audienceSize'), value: data.expected_audience_size },
        { label: t('crm.common.frequency'), value: data.frequency },
      ],
    },
    location(lead, data.area, t),
    {
      key: 'reach',
      title: t('crm.hostLeads.reach'),
      icon: 'groups',
      rows: [
        { label: t('crm.hostLeads.communityLink'), value: link(data.community_link) },
        { label: t('crm.hostLeads.communitySize'), value: data.community_size },
        {
          label: t('crm.hostLeads.previousEvents'),
          value: data.previous_events_hosted ? t('shell.common.yes') : t('shell.common.no'),
        },
        { label: t('crm.hostLeads.pastAttendees'), value: data.past_attendees },
        { label: t('crm.hostLeads.intent'), value: crmJoinList(data.host_intent_scores) },
      ],
    },
  ];
}

function ecommSections(data: EcommOverview, lead: CardLead, t: Translate): SectionModel[] {
  return [
    {
      key: 'details',
      title: t('crm.ecommLeads.sellerDetails'),
      icon: 'storefront',
      rows: [
        { label: t('crm.common.superCategory2'), value: data.super_category?.name },
        { label: t('crm.common.brand'), value: data.brand_name },
        { label: t('crm.ecommLeads.businessType'), value: data.business_type },
        { label: t('crm.common.productCategories'), value: crmJoinList(data.product_categories) },
        { label: t('crm.ecommLeads.catalogueSize'), value: data.catalog_size },
        { label: t('crm.ecommLeads.priceRange'), value: data.price_range },
        { label: t('shell.nav.fulfilment'), value: data.fulfilment_mode },
        { label: t('crm.ecommLeads.monthlyOrders'), value: data.monthly_orders },
      ],
    },
    location(lead, data.area, t),
    {
      key: 'presence',
      title: t('crm.ecommLeads.taxAndOnlinePresence'),
      icon: 'language',
      rows: [
        { label: t('crm.ecommLeads.gstNumber'), value: data.gst_number },
        {
          label: t('crm.common.gstApplicable'),
          value: data.gst_applicable ? t('shell.common.yes') : t('shell.common.no'),
        },
        { label: t('crm.common.website'), value: link(data.website) },
        { label: t('crm.common.instagram'), value: link(data.instagram_link) },
        ...data.social_links.map((social) => ({
          label: social.name || social.url,
          value: link(social.url),
        })),
        { label: t('crm.ecommLeads.marketplaces'), value: crmJoinList(data.marketplace_links) },
      ],
    },
  ];
}

function creatorRows(data: CreatorOverview, t: Translate): SectionModel['rows'] {
  return [
    { label: t('crm.common.superCategory2'), value: data.super_category?.name },
    { label: t('crm.creatorLeads.handle'), value: data.handle },
    { label: t('crm.creatorLeads.primaryPlatform'), value: data.primary_platform },
    { label: t('crm.creatorLeads.niches'), value: crmJoinList(data.niches) },
    { label: t('crm.creatorLeads.followers'), value: crmFormatCount(data.followers_count) },
    {
      label: t('crm.creatorLeads.engagementRate'),
      value: data.engagement_rate == null ? CRM_DASH : `${data.engagement_rate}%`,
    },
    {
      label: t('crm.creatorLeads.collaborationTypes'),
      value: crmJoinList(data.collaboration_types),
    },
    { label: t('crm.creatorLeads.rateCard'), value: data.rate_card },
    { label: t('crm.creatorLeads.profileLinks'), value: crmJoinList(data.profile_links) },
  ];
}

function communityRows(data: CommunityOverview, t: Translate): SectionModel['rows'] {
  return [
    { label: t('crm.common.superCategory2'), value: data.super_category?.name },
    { label: t('crm.communityLeads.communityType'), value: data.community_type },
    { label: t('crm.communityLeads.platform'), value: data.platform },
    { label: t('crm.communityLeads.members'), value: crmFormatCount(data.member_count) },
    { label: t('crm.communityLeads.meetupFrequency'), value: data.meetup_frequency },
    { label: t('crm.communityLeads.communityLink'), value: link(data.community_link) },
    { label: t('crm.communityLeads.interests'), value: crmJoinList(data.interests) },
    {
      label: t('crm.communityLeads.partnershipInterests'),
      value: crmJoinList(data.partnership_interests),
    },
  ];
}

function prospectSections(
  data: CreatorOverview | CommunityOverview,
  rows: SectionModel['rows'],
  lead: CardLead,
  t: Translate,
): SectionModel[] {
  return [
    { key: 'details', title: t('crm.prospectLeads.profile'), icon: 'person-pin', rows },
    location(lead, data.area, t),
    {
      key: 'presence',
      title: t('crm.prospectLeads.onlinePresence'),
      icon: 'language',
      rows: [{ label: t('crm.common.website'), value: link(data.website) }],
    },
  ];
}

/** The overview cards of each kind, in the portal's order. */
export function sectionModel(overview: KindOverview, lead: CardLead, t: Translate): SectionModel[] {
  switch (overview.kind) {
    case 'VENUE_LEAD':
      return venueSections(overview.data, lead, t);
    case 'HOST_LEAD':
      return hostSections(overview.data, lead, t);
    case 'ECOMM_LEAD':
      return ecommSections(overview.data, lead, t);
    case 'CREATOR_LEAD':
      return prospectSections(overview.data, creatorRows(overview.data, t), lead, t);
    default:
      return prospectSections(overview.data, communityRows(overview.data, t), lead, t);
  }
}
