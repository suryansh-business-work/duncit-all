import { CRM_EMAIL_HOST_VARIABLES, CRM_EMAIL_VENUE_VARIABLES, type CrmEmailVariableOption } from '@duncit/utils';

/** A reusable CRM template variable: its slug (used as {{ slug }}) + its label's copy key. */
export type LeadVariable = CrmEmailVariableOption;

/**
 * Catalogue of variables a CRM email template can use, per lead kind — shared
 * with the Duncit CRM app (@duncit/utils). The `slug` is the {{ placeholder }}
 * key; values are pulled from the lead at send time (see `venueVariableValues` /
 * `hostVariableValues`). Single source of truth for the editor's
 * "Available for …" lists and compose auto-fill.
 */
export const VENUE_VARIABLES: readonly LeadVariable[] = CRM_EMAIL_VENUE_VARIABLES;

export const HOST_VARIABLES: readonly LeadVariable[] = CRM_EMAIL_HOST_VARIABLES;

export const leadVariablesFor = (entity: 'VENUE_LEAD' | 'HOST_LEAD') =>
  entity === 'HOST_LEAD' ? HOST_VARIABLES : VENUE_VARIABLES;

/** Slug → value maps from a venue or host lead (blank when a field is empty), shared with the Duncit CRM app. */
export { crmHostTemplateValues as hostVariableValues, crmVenueTemplateValues as venueVariableValues } from '@duncit/utils';
