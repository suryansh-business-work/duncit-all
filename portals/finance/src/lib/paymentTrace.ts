/**
 * Where Finance traces a payment id, and which ids are worth a link.
 *
 * Every id a payment goes by (our DPAY- ref, an invoice number, a Razorpay
 * payment / order / refund id) opens the same Payment Trace page, so a person
 * can follow one id into every payment and log it appears in.
 */

/** The Payment Trace page for one id. The id travels in the query string, so the page is bookmarkable. */
export const paymentTracePath = (ref: string): string => `/payment-trace?ref=${encodeURIComponent(ref)}`;

/** The prefixes of ids a free-text log value may carry: Duncit refs and Razorpay's three. */
const TRACEABLE_PREFIXES = ['DPAY-', 'pay_', 'order_', 'rfnd_'] as const;

/**
 * Whether a value in a log line is an id the trace page can follow. An event's
 * details also hold words, amounts and statuses, which stay plain text.
 */
export const isTraceableId = (value: string): boolean =>
  value.split(' ').length === 1 &&
  value.trim() === value &&
  TRACEABLE_PREFIXES.some((prefix) => value.startsWith(prefix) && value.length > prefix.length);
