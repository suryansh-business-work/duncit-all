import type { LeadKind } from '@/features/leads/leadKinds';

/** What the lead page hands every tab — the one shared shape. */
export type { LeadTabProps } from './parts/tabTypes';

/** The lead kinds whose portal page has a Survey tab the API serves (LeadSurveyEntity). */
export const SURVEY_KINDS = ['VENUE_LEAD', 'HOST_LEAD'] as const;
export type SurveyKind = (typeof SURVEY_KINDS)[number];

export const isSurveyKind = (kind: LeadKind): kind is SurveyKind =>
  (SURVEY_KINDS as readonly string[]).includes(kind);

/** The lead kinds whose portal page has a Website tab. */
export const WEBSITE_KINDS = ['VENUE_LEAD', 'HOST_LEAD'] as const;
export type WebsiteKind = (typeof WEBSITE_KINDS)[number];

export const isWebsiteKind = (kind: LeadKind): kind is WebsiteKind =>
  (WEBSITE_KINDS as readonly string[]).includes(kind);
