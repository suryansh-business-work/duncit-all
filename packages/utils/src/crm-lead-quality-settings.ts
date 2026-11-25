import type { CrmQualityTone } from './crm-quality-detail';
import type { CrmTone } from './crm-quality-labels';

/**
 * Copy keys and tones for CRM › Settings › Lead Quality Score — a scoring-model
 * version's status, a settings change-log entry, what a check's threshold
 * means and each band colour (the checks themselves are worded by
 * CRM_AUTO_CHECK_KEY in crm-quality-detail). Literal keys, so the
 * localization gate sees each one. Shared by the CRM portal (settings page,
 * lead Quality tab) and the Duncit CRM app.
 */

/** A scoring-model version's status (the API's CrmLeadQualityConfigStatus). */
export type CrmQualityConfigStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export const CRM_QUALITY_CONFIG_STATUS_KEY: Readonly<Record<CrmQualityConfigStatus, string>> = {
  PUBLISHED: 'crm.leadQualitySettings.statusPublished',
  DRAFT: 'crm.leadQualitySettings.statusDraft',
  ARCHIVED: 'crm.leadQualitySettings.statusArchived',
};

export const CRM_QUALITY_CONFIG_STATUS_TONE: Readonly<Record<CrmQualityConfigStatus, CrmTone>> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
};

/** What a settings change-log entry was. */
export const CRM_QUALITY_CHANGE_KIND_KEY: Readonly<Record<string, string>> = {
  CONFIG_DRAFT: 'crm.leadQualitySettings.kindDraft',
  CONFIG_PUBLISH: 'crm.leadQualitySettings.kindPublish',
  CONFIG_DISCARD: 'crm.leadQualitySettings.kindDiscard',
};

/** What the threshold means for each check that takes one. */
export const CRM_QUALITY_THRESHOLD_HINT_KEY: Readonly<Record<string, string | undefined>> = {
  INSTAGRAM_FOLLOWERS_MIN: 'crm.leadQualitySettings.thresholdFollowers',
  INSTAGRAM_RECENT_POST_DAYS: 'crm.leadQualitySettings.thresholdRecentDays',
  GOOGLE_REVIEWS_MIN: 'crm.leadQualitySettings.thresholdReviews',
};

/** A classification band's colour (the band tones are the shared success / warning / error tones). */
export const CRM_QUALITY_BAND_TONE_KEY: Readonly<Record<CrmQualityTone, string>> = {
  success: 'crm.leadQualitySettings.toneSuccess',
  warning: 'crm.leadQualitySettings.toneWarning',
  error: 'crm.leadQualitySettings.toneError',
};
