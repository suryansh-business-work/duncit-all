import type { SmartIncentivePctIssue } from './smart-incentive';

/**
 * Every word the host's Smart Incentive editor and its explainer render,
 * assembled from the calling surface's own translator.
 *
 * Each key is written out as a literal `t('…')` rather than built from a
 * namespace + a suffix, because `scripts/verify-translation-keys.mjs` greps
 * source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails the Shared Gates job. Same shape (and
 * same reason) as pod-ticket-discount-copy.ts.
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`.
 * The server stores one row per key path, so the two namespaces cannot
 * collapse into one — the values are kept word-for-word identical instead.
 */
export type SmartIncentiveTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;

/** The explainer that opens when a host switches the incentive on. */
export interface SmartIncentiveInfoLabels {
  title: string;
  /** "When a member stays on your pod page for 15 seconds…" */
  what: (seconds: number) => string;
  who: string;
  cut: string;
  change: string;
  gotIt: string;
}

export interface SmartIncentiveLabels {
  title: string;
  switchLabel: string;
  hint: string;
  pctLabel: string;
  maxHint: (max: number) => string;
  /** "With the offer, a ticket costs ₹450" — `price` already formatted. */
  pricePreview: (price: string) => string;
  learnMore: string;
  /** One message per issue code `smartIncentivePctIssue` can report. */
  errors: Record<SmartIncentivePctIssue, (maxPct: number) => string>;
  info: SmartIncentiveInfoLabels;
}

/** `mweb.*` — mWeb and the native app (one namespace for both). */
export function mwebSmartIncentiveLabels(t: SmartIncentiveTranslate): SmartIncentiveLabels {
  return {
    title: t('mweb.smartIncentive.title'),
    switchLabel: t('mweb.smartIncentive.switchLabel'),
    hint: t('mweb.smartIncentive.hint'),
    pctLabel: t('mweb.smartIncentive.pctLabel'),
    maxHint: (max) => t('mweb.smartIncentive.maxHint', { vars: { max } }),
    pricePreview: (price) => t('mweb.smartIncentive.pricePreview', { vars: { price } }),
    learnMore: t('mweb.smartIncentive.learnMore'),
    errors: {
      REQUIRED: () => t('mweb.smartIncentive.errorRequired'),
      PCT_MIN: () => t('mweb.smartIncentive.errorPctMin'),
      PCT_MAX: (max) => t('mweb.smartIncentive.errorPctMax', { vars: { max } }),
    },
    info: {
      title: t('mweb.smartIncentive.infoTitle'),
      what: (seconds) => t('mweb.smartIncentive.infoWhat', { vars: { seconds } }),
      who: t('mweb.smartIncentive.infoWho'),
      cut: t('mweb.smartIncentive.infoCut'),
      change: t('mweb.smartIncentive.infoChange'),
      gotIt: t('mweb.smartIncentive.gotIt'),
    },
  };
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellSmartIncentiveLabels(t: SmartIncentiveTranslate): SmartIncentiveLabels {
  return {
    title: t('shell.smartIncentive.title'),
    switchLabel: t('shell.smartIncentive.switchLabel'),
    hint: t('shell.smartIncentive.hint'),
    pctLabel: t('shell.smartIncentive.pctLabel'),
    maxHint: (max) => t('shell.smartIncentive.maxHint', { vars: { max } }),
    pricePreview: (price) => t('shell.smartIncentive.pricePreview', { vars: { price } }),
    learnMore: t('shell.smartIncentive.learnMore'),
    errors: {
      REQUIRED: () => t('shell.smartIncentive.errorRequired'),
      PCT_MIN: () => t('shell.smartIncentive.errorPctMin'),
      PCT_MAX: (max) => t('shell.smartIncentive.errorPctMax', { vars: { max } }),
    },
    info: {
      title: t('shell.smartIncentive.infoTitle'),
      what: (seconds) => t('shell.smartIncentive.infoWhat', { vars: { seconds } }),
      who: t('shell.smartIncentive.infoWho'),
      cut: t('shell.smartIncentive.infoCut'),
      change: t('shell.smartIncentive.infoChange'),
      gotIt: t('shell.smartIncentive.gotIt'),
    },
  };
}
