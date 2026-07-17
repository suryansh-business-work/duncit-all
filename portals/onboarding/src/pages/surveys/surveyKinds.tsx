import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
import type { SurveyKind } from './queries';

/** Presentation + routing metadata for one survey audience ("who it's for"). */
export interface SurveyKindMeta {
  kind: SurveyKind;
  /** URL slug used in `/surveys/kind/:slug`. */
  slug: string;
  /** Short label (chips, buttons). */
  label: string;
  /** Card heading. */
  title: string;
  /** Card subheading. */
  subtitle: string;
  Icon: ComponentType<SvgIconProps>;
}

/** The four onboarding audiences a survey can target. Single source of truth
 *  for the Surveys hub cards, the kind-scoped list and the builder back-nav. */
export const KIND_META: Record<SurveyKind, SurveyKindMeta> = {
  VENUE: {
    kind: 'VENUE',
    slug: 'venue',
    label: 'Venue',
    title: 'Venue Surveys',
    subtitle: 'Questions shown before a partner registers a venue.',
    Icon: StorefrontIcon,
  },
  HOST: {
    kind: 'HOST',
    slug: 'host',
    label: 'Host',
    title: 'Host Surveys',
    subtitle: 'Questions shown before a member becomes a host.',
    Icon: PeopleIcon,
  },
  ECOMM: {
    kind: 'ECOMM',
    slug: 'seller',
    label: 'Seller',
    title: 'Seller Surveys',
    subtitle: 'Questions for e-commerce brand onboarding.',
    Icon: Inventory2Icon,
  },
  CLUB_ADMIN: {
    kind: 'CLUB_ADMIN',
    slug: 'club-admin',
    label: 'Club Admin',
    title: 'Club Admin Surveys',
    subtitle: 'Questions for club admin onboarding.',
    Icon: GroupsIcon,
  },
};

/** Ordered list for the hub cards. */
export const SURVEY_KINDS: SurveyKindMeta[] = [
  KIND_META.VENUE,
  KIND_META.HOST,
  KIND_META.ECOMM,
  KIND_META.CLUB_ADMIN,
];

const BY_SLUG: Record<string, SurveyKindMeta> = Object.fromEntries(
  SURVEY_KINDS.map((m) => [m.slug, m]),
);

/** Resolve a URL slug to its kind metadata (undefined for an unknown slug). */
export const kindMetaBySlug = (slug?: string): SurveyKindMeta | undefined =>
  slug ? BY_SLUG[slug] : undefined;

/** Resolve a survey kind to its metadata. */
export const kindMetaByKind = (kind: SurveyKind): SurveyKindMeta => KIND_META[kind];
