import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
import type { SurveyKind } from './queries';
import { useTranslation } from '@duncit/app-settings';

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
type Translate = ReturnType<typeof useTranslation>['t'];

export const kindMeta = (t: Translate): Record<SurveyKind, SurveyKindMeta> => ({
  VENUE: {
    kind: 'VENUE',
    slug: 'venue',
    label: t('onboarding.common.venue'),
    title: t('onboarding.surveys.venueSurveys'),
    subtitle: t('onboarding.surveys.questionsShownBeforeAPartnerRegisters'),
    Icon: StorefrontIcon,
  },
  HOST: {
    kind: 'HOST',
    slug: 'host',
    label: t('onboarding.common.host'),
    title: t('onboarding.surveys.hostSurveys'),
    subtitle: t('onboarding.surveys.questionsShownBeforeAMemberBecomes'),
    Icon: PeopleIcon,
  },
  ECOMM: {
    kind: 'ECOMM',
    slug: 'seller',
    label: t('onboarding.surveys.eCommerceBrand'),
    title: t('onboarding.surveys.eCommerceBrandSurveys'),
    subtitle: t('onboarding.surveys.questionsForECommerceBrandOnboarding'),
    Icon: Inventory2Icon,
  },
  CLUB_ADMIN: {
    kind: 'CLUB_ADMIN',
    slug: 'club-admin',
    label: t('onboarding.common.clubAdmin'),
    title: t('onboarding.surveys.clubAdminSurveys'),
    subtitle: t('onboarding.surveys.questionsForClubAdminOnboarding'),
    Icon: GroupsIcon,
  },
});

/** Ordered list for the hub cards. */
export const surveyKinds = (t: Translate): SurveyKindMeta[] => {
  const meta = kindMeta(t);
  return [meta.VENUE, meta.HOST, meta.ECOMM, meta.CLUB_ADMIN];
};

const bySlug = (t: Translate): Record<string, SurveyKindMeta> =>
  Object.fromEntries(surveyKinds(t).map((m) => [m.slug, m]));

/** Resolve a URL slug to its kind metadata (undefined for an unknown slug). */
export const kindMetaBySlug = (slug: string | undefined, t: Translate): SurveyKindMeta | undefined =>
  slug ? bySlug(t)[slug] : undefined;

/** Resolve a survey kind to its metadata. */
export const kindMetaByKind = (kind: SurveyKind, t: Translate): SurveyKindMeta => kindMeta(t)[kind];
