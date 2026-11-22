import type { ReactNode } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HandshakeIcon from '@mui/icons-material/Handshake';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import InterestsIcon from '@mui/icons-material/Interests';
import type { useTranslation } from '@duncit/shell';
import type { CommunityLead, CreatorLead, ProspectLead } from '../../api/prospectLeads.types';
import ExternalLink from '../../components/ExternalLink';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface DetailRow {
  label: string;
  value: ReactNode;
}

export interface StatTile {
  key: string;
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
  accent: 'info' | 'secondary' | 'primary' | 'warning';
}

const DASH = '—';
const joinList = (values?: string[] | null) => (values?.length ? values.join(', ') : DASH);
const formatCount = (value?: number | null) => (value === null || value === undefined ? DASH : value.toLocaleString());
const link = (href?: string | null) => (href ? <ExternalLink variant="body2" href={href} /> : DASH);

const isCreator = (lead: ProspectLead): lead is CreatorLead => 'creator_name' in lead;

/** The kind-specific rows of the Overview profile card. */
export function profileRows(lead: ProspectLead, t: Translate): DetailRow[] {
  if (isCreator(lead)) {
    return [
      { label: t('crm.common.superCategory2'), value: lead.super_category?.name || DASH },
      { label: t('crm.creatorLeads.handle'), value: lead.handle || DASH },
      { label: t('crm.creatorLeads.primaryPlatform'), value: lead.primary_platform || DASH },
      { label: t('crm.creatorLeads.niches'), value: joinList(lead.niches) },
      { label: t('crm.creatorLeads.followers'), value: formatCount(lead.followers_count) },
      {
        label: t('crm.creatorLeads.engagementRate'),
        value: lead.engagement_rate === null || lead.engagement_rate === undefined ? DASH : `${lead.engagement_rate}%`,
      },
      { label: t('crm.creatorLeads.collaborationTypes'), value: joinList(lead.collaboration_types) },
      { label: t('crm.creatorLeads.rateCard'), value: lead.rate_card || DASH },
      { label: t('crm.creatorLeads.profileLinks'), value: joinList(lead.profile_links) },
    ];
  }
  const community = lead as CommunityLead;
  return [
    { label: t('crm.common.superCategory2'), value: community.super_category?.name || DASH },
    { label: t('crm.communityLeads.communityType'), value: community.community_type || DASH },
    { label: t('crm.communityLeads.platform'), value: community.platform || DASH },
    { label: t('crm.communityLeads.members'), value: formatCount(community.member_count) },
    { label: t('crm.communityLeads.meetupFrequency'), value: community.meetup_frequency || DASH },
    { label: t('crm.communityLeads.communityLink'), value: link(community.community_link) },
    { label: t('crm.communityLeads.interests'), value: joinList(community.interests) },
    { label: t('crm.communityLeads.partnershipInterests'), value: joinList(community.partnership_interests) },
  ];
}

/** The chip shown beside status in the hero (platform for a creator, type for a community). */
export function kindChip(lead: ProspectLead): string | null {
  return isCreator(lead) ? lead.primary_platform || null : (lead as CommunityLead).community_type || null;
}

/** The two kind-specific stat tiles under the hero. */
export function statTiles(lead: ProspectLead, t: Translate): StatTile[] {
  if (isCreator(lead)) {
    return [
      {
        key: 'reach',
        label: t('crm.creatorLeads.followers'),
        value: formatCount(lead.followers_count),
        hint: lead.primary_platform || t('crm.creatorLeads.platformNotSet'),
        icon: <TrendingUpIcon fontSize="small" />,
        accent: 'info',
      },
      {
        key: 'collab',
        label: t('crm.creatorLeads.collaborationTypes'),
        value: lead.collaboration_types.length,
        hint: lead.collaboration_types.slice(0, 2).join(', ') || t('crm.creatorLeads.noneSelected'),
        icon: <HandshakeIcon fontSize="small" />,
        accent: 'secondary',
      },
    ];
  }
  const community = lead as CommunityLead;
  return [
    {
      key: 'members',
      label: t('crm.communityLeads.members'),
      value: formatCount(community.member_count),
      hint: community.platform || t('crm.communityLeads.platformNotSet'),
      icon: <GroupsIcon fontSize="small" />,
      accent: 'info',
    },
    {
      key: 'meetups',
      label: t('crm.communityLeads.meetupFrequency'),
      value: community.meetup_frequency || DASH,
      hint: community.interests.slice(0, 2).join(', ') || t('crm.communityLeads.noInterests'),
      icon: community.meetup_frequency ? <EventRepeatIcon fontSize="small" /> : <InterestsIcon fontSize="small" />,
      accent: 'secondary',
    },
  ];
}
