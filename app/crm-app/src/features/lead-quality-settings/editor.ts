import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  leadQualityEditor,
  type LeadQualityConfigInput,
  type LeadQualityFormValues,
} from '@duncit/forms/schemas';

import type { CrmAppLeadQualitySettingsDocument } from '@/graphql/leadQualitySettings';
import * as rules from '@/generated/lead-quality-rules';
import type { AutoCheck, BandTone } from '@/generated/lead-quality-rules';

/**
 * The scoring-model editor (shared with the CRM portal in
 * `@duncit/forms/schemas`), bound to this app's generated copy of the server
 * rules — so the app refuses exactly what the API (and the portal) refuses.
 */
export const LEAD_QUALITY_EDITOR = leadQualityEditor(rules);

export type QualityFormValues = LeadQualityFormValues<AutoCheck, BandTone>;

/** What Save draft and Publish hand on: the exact API input and whether it differs from what was loaded. */
export interface QualitySubmission {
  input: LeadQualityConfigInput<AutoCheck, BandTone>;
  change_note: string;
  /** The form holds edits the stored draft does not have yet (publishing saves them first). */
  dirty: boolean;
}

export type QualitySettings = ResultOf<
  typeof CrmAppLeadQualitySettingsDocument
>['crmLeadQualitySettings'];
export type QualityConfig = QualitySettings['published'];

/** The most recent settings changes the log lists (the portal's limit). */
export const HISTORY_LIMIT = 100;
