import type { ResultOf } from '@graphql-typed-document-node/core';

import type { Lead } from '@/features/leads/useLead';
import type { CrmAppLeadOverviewDocument } from '@/graphql/leadTabs';
import type { RowValue } from '../parts/DetailRow';
import type { IconName } from '../parts/DetailCard';

type Overview = ResultOf<typeof CrmAppLeadOverviewDocument>;

export type VenueOverview = NonNullable<Overview['venue']>;
export type HostOverview = NonNullable<Overview['host']>;
export type EcommOverview = NonNullable<Overview['ecomm']>;
export type CreatorOverview = NonNullable<Overview['creator']>;
export type CommunityOverview = NonNullable<Overview['community']>;
export type MatchedUser = NonNullable<VenueOverview['matched_user']>;

/** One kind's overview read, tagged with its kind so each mapper sees its own fields. */
export type KindOverview =
  | { kind: 'VENUE_LEAD'; data: VenueOverview }
  | { kind: 'HOST_LEAD'; data: HostOverview }
  | { kind: 'ECOMM_LEAD'; data: EcommOverview }
  | { kind: 'CREATOR_LEAD'; data: CreatorOverview }
  | { kind: 'COMMUNITY_LEAD'; data: CommunityOverview };

/** The lead card fields every kind shares (status, owner, follow-up, contacts). */
export type CardLead = Pick<
  Lead,
  'city' | 'lead_status' | 'priority' | 'assigned_to' | 'next_follow_up_date' | 'contacts'
>;

/** The hero row under the name: the photo, the chips after status and priority, and the tags. */
export interface HeroModel {
  photo: string | null;
  /** A host type, a brand, a creator's platform or a community's type. */
  kindChip: string | null;
  superCategory: string | null;
  matched: MatchedUser | null;
  /** The first two venue types or interests, and how many more there are. */
  extras: string[];
  more: number;
  tags: string[];
}

/** One overview card: its title and icon, its rows, and the venue's map link under them. */
export interface SectionModel {
  key: string;
  title: string;
  icon: IconName;
  rows: { label: string; value: RowValue }[];
  /** Only the venue's Location card: the Google Maps link, or null when there is no address. */
  map?: { url: string | null };
}

/** The Lead tracking card. */
export interface TrackingModel {
  source: string | null | undefined;
  followUpLabel: string;
  created: string;
  updated: string;
  /** The remarks (venue) or notes, with their caption; null when empty. */
  note: { caption: string; text: string } | null;
}
