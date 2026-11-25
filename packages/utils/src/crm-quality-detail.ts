import type { CrmTone } from './crm-quality-labels';

/**
 * One lead's Lead Quality Score as its detail page shows it — the copy keys,
 * tones and formatting of the breakdown, the evidence and the history. Shared
 * by the CRM portal's Quality Score tab and the Duncit CRM app's, so both word
 * and colour every value the API returns the same way (literal keys, so the
 * localization gate sees each one).
 */

export const CRM_VERIFICATION_KEY: Readonly<Record<string, string>> = {
  COMPLETE: 'crm.leadQuality.verificationComplete',
  IN_PROGRESS: 'crm.leadQuality.verificationInProgress',
  PENDING: 'crm.leadQuality.verificationPending',
};

/** An item's evidence status and a criterion's roll-up (PARTIAL only for criteria). */
export const CRM_QUALITY_STATUS_KEY: Readonly<Record<string, string>> = {
  VERIFIED: 'crm.leadQuality.statusVerified',
  PARTIAL: 'crm.leadQuality.statusPartial',
  PENDING: 'crm.leadQuality.statusPending',
  FAILED: 'crm.leadQuality.statusFailed',
};

export const CRM_QUALITY_STATUS_TONE: Readonly<Record<string, CrmTone>> = {
  VERIFIED: 'success',
  PARTIAL: 'warning',
  PENDING: 'default',
  FAILED: 'error',
};

export const CRM_GATE_KEY: Readonly<Record<string, string>> = {
  PASSED: 'crm.leadQuality.gatePassed',
  FAILED: 'crm.leadQuality.gateFailed',
  PENDING: 'crm.leadQuality.gatePending',
};

export const CRM_GATE_TONE: Readonly<Record<string, CrmTone>> = { PASSED: 'success', FAILED: 'error', PENDING: 'warning' };

export const CRM_AUTO_CHECK_KEY: Readonly<Record<string, string>> = {
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
export const CRM_VIA_KEY: Readonly<Record<string, string>> = {
  MANUAL: 'crm.leadQuality.viaManual',
  MCP: 'crm.leadQuality.viaMcp',
  SYSTEM: 'crm.leadQuality.viaSystem',
  AI: 'crm.leadQuality.viaAi',
};

/** What started a rescore, as the history names it. */
export const CRM_QUALITY_TRIGGER_KEY: Readonly<Record<string, string>> = {
  CREATE: 'crm.leadQualityTab.triggerCreate',
  UPDATE: 'crm.leadQualityTab.triggerUpdate',
  EVIDENCE: 'crm.leadQualityTab.triggerEvidence',
  RECALCULATE: 'crm.leadQualityTab.triggerRecalculate',
  CONFIG_PUBLISH: 'crm.leadQualityTab.triggerConfigPublish',
  RESEARCH: 'crm.leadQualityTab.triggerResearch',
  BACKFILL: 'crm.leadQualityTab.triggerBackfill',
};

/** A label key, falling back to `fallback` when the server sends a value this build does not know. */
export const crmKeyOr = (
  map: Readonly<Record<string, string>>,
  value: string | null | undefined,
  fallback: string,
): string => (value && map[value]) || fallback;

/** The score band colours the server assigns (red 0-39, yellow 40-79, green 80-100 by default). */
export type CrmQualityTone = 'success' | 'warning' | 'error';

const isQualityTone = (value: string | null | undefined): value is CrmQualityTone =>
  value === 'success' || value === 'warning' || value === 'error';

/** The ring's colour for a band tone; anything unknown reads as the lowest band. */
export const crmQualityTone = (value: string | null | undefined): CrmQualityTone =>
  isQualityTone(value) ? value : 'error';

const POINTS = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** Points and scores as the breakdown prints them: whole numbers stay whole, halves keep one decimal. */
export const crmFormatPoints = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? POINTS.format(value) : '—';

/** A score clamped to the ring's 0-100, or null when the lead has not been scored. */
export const crmRingValue = (score: number | null | undefined): number | null =>
  typeof score === 'number' && Number.isFinite(score) ? Math.min(Math.max(score, 0), 100) : null;

/** Evidence by the item key it was recorded against. */
export const crmEvidenceByKey = <T extends { item_key: string }>(evidence: readonly T[]): ReadonlyMap<string, T> =>
  new Map(evidence.map((row) => [row.item_key, row]));

/** Item names by key, for the history (it stores keys, the breakdown knows names). */
export const crmItemNamesOf = (
  result: { criteria: readonly { items: readonly { key: string; name: string }[] }[] } | null | undefined,
): ReadonlyMap<string, string> =>
  new Map((result?.criteria ?? []).flatMap((criterion) => criterion.items.map((item) => [item.key, item.name] as const)));

/**
 * Why the server refused an evidence decision: a refusal comes back as
 * BAD_USER_INPUT with every problem in `extensions.errors`. Null when the
 * error carries no such list (network, permission), for the caller's own message.
 */
export function crmListedRefusals(extensions: Readonly<Record<string, unknown>> | null | undefined): string[] | null {
  const listed = extensions?.errors;
  if (!Array.isArray(listed)) return null;
  const messages = listed.filter((message): message is string => typeof message === 'string' && message.trim() !== '');
  return messages.length > 0 ? messages : null;
}
