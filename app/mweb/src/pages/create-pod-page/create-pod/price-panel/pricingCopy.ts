/**
 * The Step-4 pricing copy, resolved against mWeb's bundled English.
 *
 * The text itself lives in the shared catalogue (`mweb.createPod.*`) and every
 * component reads it through `t()`, so this file holds no copy of its own — it
 * only gives callers that run outside React (the schema's module-level export,
 * and the pricing tests) the same English the panel renders.
 */
import { fallbackT } from '../../../../i18n/fallback';

/** Zero-earnings info box, shown under the Ticket Price field. */
export const ZERO_EARNINGS_TITLE = fallbackT('mweb.createPod.zeroEarningsTitle');
export const ZERO_EARNINGS_BODY = fallbackT('mweb.createPod.zeroEarningsBody');

/** Shown inside the Venue Charges accordion when the pod cannot pay the slot. */
export const VENUE_SHORTFALL_MESSAGE = fallbackT('mweb.createPod.venueShortfall');

/** The Ticket Price field starts blank — it only ever holds what the host typed,
 * so ₹0 can never be implied — and Create Pod stays blocked until it is filled. */
export const TICKET_PRICE_REQUIRED = fallbackT('mweb.createPod.validation.ticketPriceRequired');

/** The suggestions modal's empty state and its highlighted recommendation. */
export const SUGGESTED_PRICES_EMPTY = fallbackT('mweb.createPod.suggestedPricesEmpty');
export const SUGGESTED_PRICES_NOTE = fallbackT('mweb.createPod.suggestedPricesNote');

/**
 * One description per suggested tier, in ladder order (cheapest first). The
 * server returns at most 5 rows, so index i always has a description.
 */
export const SUGGESTED_PRICE_TIER_KEYS = [
  'mweb.createPod.priceTier1',
  'mweb.createPod.priceTier2',
  'mweb.createPod.priceTier3',
  'mweb.createPod.priceTier4',
  'mweb.createPod.priceTier5',
];
