import type { Types } from 'mongoose';
import { PaymentModel } from './payment.model';
import { RAZORPAY_ID_SEARCH_FIELDS } from './payment.gatewayIds';

/** Razorpay's id prefixes: payment, order and refund. */
const RAZORPAY_ID_PREFIXES = ['pay_', 'order_', 'rfnd_'] as const;

/** The most payments one pasted id may resolve to. One id normally names one
 * payment; the cap only keeps a bad term from turning into an unbounded `$in`. */
export const RAZORPAY_SEARCH_LIMIT = 50;

/** The payments a pasted Razorpay id belongs to, as both reference shapes the
 * other collections store: the Payment `_id` and the Duncit `payment_id` ref. */
export interface RazorpayPaymentRefs {
  docIds: Types.ObjectId[];
  refs: string[];
}

const NO_REFS: RazorpayPaymentRefs = { docIds: [], refs: [] };

/** True when the whole term is shaped like a Razorpay payment, order or refund id. */
export function isRazorpayIdTerm(term: string): boolean {
  return RAZORPAY_ID_PREFIXES.some((prefix) => term.startsWith(prefix) && term.length > prefix.length);
}

/**
 * Finds the payments a Razorpay id copied from the dashboard belongs to.
 *
 * Coin, gift card, shop order, rental and backout rows point at a payment by
 * reference only, so their own search fields can never match `pay_…`. Payment
 * Logs matches these ids on the row itself; every other table resolves the
 * term here first and matches the payments it names.
 *
 * Only a whole Razorpay id is looked up, and it is matched exactly, so typing
 * a name into a table never costs an extra read.
 */
export async function razorpayPaymentRefs(search: string | null | undefined): Promise<RazorpayPaymentRefs> {
  const term = search?.trim() ?? '';
  if (!isRazorpayIdTerm(term)) return NO_REFS;
  const docs = await PaymentModel.find({ $or: RAZORPAY_ID_SEARCH_FIELDS.map((path) => ({ [path]: term })) })
    .select('_id payment_id')
    .limit(RAZORPAY_SEARCH_LIMIT)
    .lean();
  return { docIds: docs.map((doc) => doc._id), refs: docs.map((doc) => doc.payment_id) };
}

/**
 * The `searchAlso` clause for a table whose rows hold a payment reference at
 * `path`: `'docId'` when the path stores the Payment `_id`, `'ref'` when it
 * stores the Duncit `payment_id`. Empty when the term names no payment, so the
 * table's own search runs unchanged.
 */
export async function razorpaySearchAlso(
  search: string | null | undefined,
  path: string,
  shape: 'docId' | 'ref'
): Promise<Record<string, unknown>[]> {
  const found = await razorpayPaymentRefs(search);
  const values = shape === 'docId' ? found.docIds : found.refs;
  return values.length > 0 ? [{ [path]: { $in: values } }] : [];
}
