import type { TicketDiscountIssueCode } from './pod-ticket-discount';

/**
 * Every word the multi-ticket discount editor renders, assembled from the
 * calling surface's own translator.
 *
 * Each key is written out as a literal `t('…')` rather than built from a
 * namespace + a suffix, because `scripts/verify-translation-keys.mjs` greps
 * source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails the Shared Gates job. Same shape (and
 * same reason) as pod-attendance-copy.ts.
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`;
 * the portal pod form ships `podForm.*`. The server stores one row per key
 * path, so the three namespaces cannot collapse into one — the values are kept
 * word-for-word identical instead.
 */
export type TicketDiscountTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;

/** The limits an error message may quote. */
export interface TicketDiscountLimits {
  maxPct: number;
  maxTickets: number;
  maxTiers: number;
}

export interface TicketDiscountLabels {
  title: string;
  switchLabel: string;
  hint: string;
  baseRow: string;
  ticketsLabel: string;
  discountLabel: string;
  addTier: string;
  removeTier: string;
  maxHint: (max: number) => string;
  perTicket: (price: string) => string;
  /** One message per issue code `ticketDiscountTierIssues` can report. */
  errors: Record<TicketDiscountIssueCode, (limits: TicketDiscountLimits) => string>;
}

/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebTicketDiscountLabels(t: TicketDiscountTranslate): TicketDiscountLabels {
  return {
    title: t('mweb.ticketDiscount.title'),
    switchLabel: t('mweb.ticketDiscount.switchLabel'),
    hint: t('mweb.ticketDiscount.hint'),
    baseRow: t('mweb.ticketDiscount.baseRow'),
    ticketsLabel: t('mweb.ticketDiscount.ticketsLabel'),
    discountLabel: t('mweb.ticketDiscount.discountLabel'),
    addTier: t('mweb.ticketDiscount.addTier'),
    removeTier: t('mweb.ticketDiscount.removeTier'),
    maxHint: (max) => t('mweb.ticketDiscount.maxHint', { vars: { max } }),
    perTicket: (price) => t('mweb.ticketDiscount.perTicket', { vars: { price } }),
    errors: {
      TIERS_REQUIRED: () => t('mweb.ticketDiscount.errorTiersRequired'),
      TOO_MANY_TIERS: ({ maxTiers }) =>
        t('mweb.ticketDiscount.errorTooManyTiers', { vars: { max: maxTiers } }),
      TICKETS_MIN: () => t('mweb.ticketDiscount.errorTicketsMin'),
      TICKETS_MAX: ({ maxTickets }) =>
        t('mweb.ticketDiscount.errorTicketsMax', { vars: { max: maxTickets } }),
      TICKETS_NOT_INCREASING: () => t('mweb.ticketDiscount.errorTicketsNotIncreasing'),
      PCT_MIN: () => t('mweb.ticketDiscount.errorPctMin'),
      PCT_MAX: ({ maxPct }) => t('mweb.ticketDiscount.errorPctMax', { vars: { max: maxPct } }),
      PCT_NOT_INCREASING: () => t('mweb.ticketDiscount.errorPctNotIncreasing'),
    },
  };
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellTicketDiscountLabels(t: TicketDiscountTranslate): TicketDiscountLabels {
  return {
    title: t('shell.ticketDiscount.title'),
    switchLabel: t('shell.ticketDiscount.switchLabel'),
    hint: t('shell.ticketDiscount.hint'),
    baseRow: t('shell.ticketDiscount.baseRow'),
    ticketsLabel: t('shell.ticketDiscount.ticketsLabel'),
    discountLabel: t('shell.ticketDiscount.discountLabel'),
    addTier: t('shell.ticketDiscount.addTier'),
    removeTier: t('shell.ticketDiscount.removeTier'),
    maxHint: (max) => t('shell.ticketDiscount.maxHint', { vars: { max } }),
    perTicket: (price) => t('shell.ticketDiscount.perTicket', { vars: { price } }),
    errors: {
      TIERS_REQUIRED: () => t('shell.ticketDiscount.errorTiersRequired'),
      TOO_MANY_TIERS: ({ maxTiers }) =>
        t('shell.ticketDiscount.errorTooManyTiers', { vars: { max: maxTiers } }),
      TICKETS_MIN: () => t('shell.ticketDiscount.errorTicketsMin'),
      TICKETS_MAX: ({ maxTickets }) =>
        t('shell.ticketDiscount.errorTicketsMax', { vars: { max: maxTickets } }),
      TICKETS_NOT_INCREASING: () => t('shell.ticketDiscount.errorTicketsNotIncreasing'),
      PCT_MIN: () => t('shell.ticketDiscount.errorPctMin'),
      PCT_MAX: ({ maxPct }) => t('shell.ticketDiscount.errorPctMax', { vars: { max: maxPct } }),
      PCT_NOT_INCREASING: () => t('shell.ticketDiscount.errorPctNotIncreasing'),
    },
  };
}

/** `podForm.*` — the portal pod form (`@duncit/pod-form`). Word-for-word identical to `mweb.*`. */
export function podFormTicketDiscountLabels(t: TicketDiscountTranslate): TicketDiscountLabels {
  return {
    title: t('podForm.ticketDiscount.title'),
    switchLabel: t('podForm.ticketDiscount.switchLabel'),
    hint: t('podForm.ticketDiscount.hint'),
    baseRow: t('podForm.ticketDiscount.baseRow'),
    ticketsLabel: t('podForm.ticketDiscount.ticketsLabel'),
    discountLabel: t('podForm.ticketDiscount.discountLabel'),
    addTier: t('podForm.ticketDiscount.addTier'),
    removeTier: t('podForm.ticketDiscount.removeTier'),
    maxHint: (max) => t('podForm.ticketDiscount.maxHint', { vars: { max } }),
    perTicket: (price) => t('podForm.ticketDiscount.perTicket', { vars: { price } }),
    errors: {
      TIERS_REQUIRED: () => t('podForm.ticketDiscount.errorTiersRequired'),
      TOO_MANY_TIERS: ({ maxTiers }) =>
        t('podForm.ticketDiscount.errorTooManyTiers', { vars: { max: maxTiers } }),
      TICKETS_MIN: () => t('podForm.ticketDiscount.errorTicketsMin'),
      TICKETS_MAX: ({ maxTickets }) =>
        t('podForm.ticketDiscount.errorTicketsMax', { vars: { max: maxTickets } }),
      TICKETS_NOT_INCREASING: () => t('podForm.ticketDiscount.errorTicketsNotIncreasing'),
      PCT_MIN: () => t('podForm.ticketDiscount.errorPctMin'),
      PCT_MAX: ({ maxPct }) => t('podForm.ticketDiscount.errorPctMax', { vars: { max: maxPct } }),
      PCT_NOT_INCREASING: () => t('podForm.ticketDiscount.errorPctNotIncreasing'),
    },
  };
}
