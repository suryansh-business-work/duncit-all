/**
 * Copy keys and tones for the Lead Quality and Lead Research values the API
 * returns — literal keys, so the localization gate sees each one. Shared by the
 * CRM portal (listing column, detail tab, settings, Lead Research, analytics)
 * and the Duncit CRM app. A tone is semantic; each surface maps it to its own
 * colours (MUI chip colours on the portal, theme tokens in the app).
 */
export type CrmTone = 'success' | 'error' | 'warning' | 'info' | 'default';

export const CRM_QUALIFICATION_KEY: Readonly<Record<string, string>> = {
  QUALIFIED: 'crm.leadQuality.qualified',
  NOT_QUALIFIED: 'crm.leadQuality.notQualified',
  PENDING_VERIFICATION: 'crm.leadQuality.pendingVerification',
};

export const CRM_QUALIFICATION_TONE: Readonly<Record<string, CrmTone>> = {
  QUALIFIED: 'success',
  NOT_QUALIFIED: 'error',
  PENDING_VERIFICATION: 'warning',
};

export const CRM_CANDIDATE_STATUS_KEY: Readonly<Record<string, string>> = {
  NEW: 'crm.leadResearch.statusNew',
  ADDED: 'crm.leadResearch.statusAdded',
  REJECTED: 'crm.leadResearch.statusRejected',
  DUPLICATE: 'crm.leadResearch.statusDuplicate',
};

export const CRM_CANDIDATE_STATUS_TONE: Readonly<Record<string, CrmTone>> = {
  NEW: 'info',
  ADDED: 'success',
  REJECTED: 'default',
  DUPLICATE: 'warning',
};
