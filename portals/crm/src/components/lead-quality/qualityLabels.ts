import type { ChipProps } from '@mui/material';
import { CRM_QUALIFICATION_KEY, CRM_QUALIFICATION_TONE } from '@duncit/utils';
import type { CrmLeadEntityType } from '../../api/crm.types';

/**
 * Copy keys and chip colours for every Lead Quality Score value the API
 * returns — literal keys, so the localization gate sees each one. Shared by
 * the listing column, the detail tab, the settings page, Lead Research and
 * the analytics page.
 */

type ChipColor = ChipProps['color'];

/* Qualification copy and colours live in @duncit/utils (crm-quality-labels), shared with the Duncit CRM app. */
export const QUALIFICATION_KEY: Record<string, string> = { ...CRM_QUALIFICATION_KEY };

export const QUALIFICATION_COLOR: Record<string, ChipColor> = { ...CRM_QUALIFICATION_TONE };

export const VERIFICATION_KEY: Record<string, string> = {
  COMPLETE: 'crm.leadQuality.verificationComplete',
  IN_PROGRESS: 'crm.leadQuality.verificationInProgress',
  PENDING: 'crm.leadQuality.verificationPending',
};

/** An item's evidence status and a criterion's roll-up (PARTIAL only for criteria). */
export const STATUS_KEY: Record<string, string> = {
  VERIFIED: 'crm.leadQuality.statusVerified',
  PARTIAL: 'crm.leadQuality.statusPartial',
  PENDING: 'crm.leadQuality.statusPending',
  FAILED: 'crm.leadQuality.statusFailed',
};

export const STATUS_COLOR: Record<string, ChipColor> = {
  VERIFIED: 'success',
  PARTIAL: 'warning',
  PENDING: 'default',
  FAILED: 'error',
};

export const GATE_KEY: Record<string, string> = {
  PASSED: 'crm.leadQuality.gatePassed',
  FAILED: 'crm.leadQuality.gateFailed',
  PENDING: 'crm.leadQuality.gatePending',
};

export const GATE_COLOR: Record<string, ChipColor> = { PASSED: 'success', FAILED: 'error', PENDING: 'warning' };

export const AUTO_CHECK_KEY: Record<string, string> = {
  NONE: 'crm.leadQuality.autoNone',
  CRM_UNIQUENESS: 'crm.leadQuality.autoCrmUniqueness',
  EMAIL_DELIVERABLE: 'crm.leadQuality.autoEmailDeliverable',
  INSTAGRAM_BUSINESS_PROFILE: 'crm.leadQuality.autoInstagramProfile',
  INSTAGRAM_FOLLOWERS_MIN: 'crm.leadQuality.autoInstagramFollowers',
  INSTAGRAM_RECENT_POST_DAYS: 'crm.leadQuality.autoInstagramRecent',
  GOOGLE_MAPS_LISTING: 'crm.leadQuality.autoGoogleMaps',
  GOOGLE_REVIEWS_MIN: 'crm.leadQuality.autoGoogleReviews',
  WEBSITE_REACHABLE: 'crm.leadQuality.autoWebsite',
};

/** Who decided an item. */
export const VIA_KEY: Record<string, string> = {
  MANUAL: 'crm.leadQuality.viaManual',
  MCP: 'crm.leadQuality.viaMcp',
  SYSTEM: 'crm.leadQuality.viaSystem',
  AI: 'crm.leadQuality.viaAi',
};

/** The listing column / route slug of each lead kind, as the shared table names them. */
export const ENTITY_OF_TABLE: Record<'host' | 'venue' | 'ecomm' | 'creator' | 'community', CrmLeadEntityType> = {
  host: 'HOST_LEAD',
  venue: 'VENUE_LEAD',
  ecomm: 'ECOMM_LEAD',
  creator: 'CREATOR_LEAD',
  community: 'COMMUNITY_LEAD',
};

export const LEAD_TYPES: readonly CrmLeadEntityType[] = ['HOST_LEAD', 'VENUE_LEAD', 'COMMUNITY_LEAD', 'CREATOR_LEAD', 'ECOMM_LEAD'];

/** A label key, falling back to the raw value's own key when the server sends a value this build does not know. */
export const keyOr = (map: Record<string, string>, value: string | null | undefined, fallback: string): string => (value && map[value]) || fallback;
