/**
 * Which checkout a payment came from — the one answer Finance filters by.
 *
 * `Payment` has no channel column. What tells its checkouts apart is frozen on
 * it when it is created: `target_type`, and `metadata.store.channel`, which only
 * the pet store's checkout writes. Stated once here so the Round Offs page and
 * the per-shop Payment Logs can never draw the line in two different places.
 *
 *  - ECOMM        the pet store (ecomm.duncit.com): `metadata.store.channel = 'PET_STORE'`
 *  - POD_BOOKING  a pod ticket (`target_type = 'POD'`) — classified by the
 *                 checkout that created it, so a booking that carried shop
 *                 add-ons is still a pod booking
 *  - POD_SHOP     the pod shop's standalone cart (`target_type = 'PRODUCT'`,
 *                 not the pet store)
 *  - OTHER        gift cards and anything else
 *
 * The pod shop and the pet store are different shops (rule 65): every filter
 * below names the pet store explicitly, on one side of the line or the other.
 */

export type PaymentSource = 'POD_BOOKING' | 'POD_SHOP' | 'ECOMM' | 'OTHER';

export const PAYMENT_SOURCES: PaymentSource[] = ['POD_BOOKING', 'POD_SHOP', 'ECOMM', 'OTHER'];

const PET_STORE = { 'metadata.store.channel': 'PET_STORE' };
const NOT_PET_STORE = { 'metadata.store.channel': { $ne: 'PET_STORE' } };

/** The Mongo filter that selects one source's payments. */
export const PAYMENT_SOURCE_FILTER: Record<PaymentSource, Record<string, unknown>> = {
  ECOMM: PET_STORE,
  POD_BOOKING: { target_type: 'POD', ...NOT_PET_STORE },
  POD_SHOP: { target_type: 'PRODUCT', ...NOT_PET_STORE },
  OTHER: { target_type: { $nin: ['POD', 'PRODUCT'] }, ...NOT_PET_STORE },
};

/** The same rule for one payment already in hand. */
export function paymentSourceOf(payment: {
  target_type?: string | null;
  // Only the pet store's stamp is read; the rest of the metadata is whatever the checkout stored.
  metadata?: { store?: { channel?: string | null } | null } | null;
}): PaymentSource {
  if (payment.metadata?.store?.channel === 'PET_STORE') return 'ECOMM';
  if (payment.target_type === 'POD') return 'POD_BOOKING';
  if (payment.target_type === 'PRODUCT') return 'POD_SHOP';
  return 'OTHER';
}

/** The sources a client asked for; anything that is not a source is dropped. */
export function parsePaymentSources(values: readonly (string | null | undefined)[]): PaymentSource[] {
  return PAYMENT_SOURCES.filter((source) => values.includes(source));
}

/** The filter for a set of sources: none asked for means no narrowing at all. */
export function paymentSourcesFilter(sources: readonly PaymentSource[]): Record<string, unknown> {
  if (sources.length === 0) return {};
  if (sources.length === 1) return PAYMENT_SOURCE_FILTER[sources[0]];
  return { $or: sources.map((source) => PAYMENT_SOURCE_FILTER[source]) };
}

/** The two shops Finance keeps separate ledgers for. */
export type PaymentShop = 'POD_SHOP' | 'ECOMM';

/**
 * Every payment that created an order in one shop.
 *
 * The pod shop's is wider than its `POD_SHOP` source: a pod booking that
 * carried shop add-ons also created pod-shop orders, so it belongs in the pod
 * shop's payment log (the row's `target_type` — POD rather than PRODUCT — is
 * what marks it as a booking with add-ons).
 */
export const PAYMENT_SHOP_FILTER: Record<PaymentShop, Record<string, unknown>> = {
  ECOMM: PET_STORE,
  POD_SHOP: {
    ...NOT_PET_STORE,
    $or: [{ target_type: 'PRODUCT' }, { target_type: 'POD', 'metadata.product_cost_total': { $gt: 0 } }],
  },
};

export const isPaymentShop = (value: unknown): value is PaymentShop =>
  value === 'POD_SHOP' || value === 'ECOMM';
