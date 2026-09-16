import type { TicketDiscountTier } from './pod-ticket-discount';
import type { TicketDiscountLabels } from './pod-ticket-discount-copy';

/**
 * The contract both multi-ticket discount editors render against — the MUI one
 * in `@duncit/ui` (mWeb stepper, portal pod form, Edit Pod sheet) and its
 * Tamagui twin in the native app (rule 27). Types only: the twins share their
 * shape here and keep their UI apart (rule 40).
 */

/** The messages one tier row shows under its two fields. */
export interface TicketDiscountTierErrors {
  min_tickets?: string;
  discount_pct?: string;
}

/** Messages the form resolved: `list` for the whole ladder, `rows[i]` for one tier's fields. */
export interface TicketDiscountFieldErrors {
  list?: string;
  rows?: ReadonlyArray<TicketDiscountTierErrors | undefined>;
}

export type TicketDiscountFieldProps = Readonly<{
  enabled: boolean;
  tiers: readonly TicketDiscountTier[];
  onEnabledChange: (enabled: boolean) => void;
  onTiersChange: (tiers: TicketDiscountTier[]) => void;
  /** `publicAppSettings.ticket_discount_max_pct`. */
  maxPct: number;
  /**
   * `ticketDiscountMaxTickets(no_of_spots)`. The MUI field uses it as the
   * input's `max`; a native number pad has no such bound, so there the form's
   * Zod refine is what reports a row above it.
   */
  maxTickets: number;
  labels: TicketDiscountLabels;
  /** The pod's ticket price; with `formatPrice` it adds a per-ticket caption to each tier. */
  unitPrice?: number;
  formatPrice?: (amount: number) => string;
  errors?: TicketDiscountFieldErrors;
  disabled?: boolean;
}>;
