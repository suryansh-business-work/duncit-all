import type { ChipProps } from '@mui/material';
import {
  CRM_AUTO_CHECK_KEY,
  CRM_GATE_KEY,
  CRM_GATE_TONE,
  CRM_QUALIFICATION_KEY,
  CRM_QUALIFICATION_TONE,
  CRM_QUALITY_STATUS_KEY,
  CRM_QUALITY_STATUS_TONE,
  CRM_VERIFICATION_KEY,
  CRM_VIA_KEY,
  crmKeyOr,
} from '@duncit/utils';
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

/* The detail tab's keys and tones live in @duncit/utils (crm-quality-detail), shared with the Duncit CRM app. */
export const VERIFICATION_KEY: Record<string, string> = { ...CRM_VERIFICATION_KEY };

/** An item's evidence status and a criterion's roll-up (PARTIAL only for criteria). */
export const STATUS_KEY: Record<string, string> = { ...CRM_QUALITY_STATUS_KEY };

export const STATUS_COLOR: Record<string, ChipColor> = { ...CRM_QUALITY_STATUS_TONE };

export const GATE_KEY: Record<string, string> = { ...CRM_GATE_KEY };

export const GATE_COLOR: Record<string, ChipColor> = { ...CRM_GATE_TONE };

export const AUTO_CHECK_KEY: Record<string, string> = { ...CRM_AUTO_CHECK_KEY };

/** Who decided an item. */
export const VIA_KEY: Record<string, string> = { ...CRM_VIA_KEY };

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
export const keyOr = crmKeyOr;
