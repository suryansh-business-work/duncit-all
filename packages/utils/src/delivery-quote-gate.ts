/**
 * Whether the product checkout may take a payment yet, as far as the DELIVERY
 * CHARGE is concerned.
 *
 * The charge is quoted by the server for one exact cart and one delivery
 * pincode. Until the answer for the cart and pincode ON SCREEN has arrived, the
 * amount on the Pay button is not the amount the server will charge — so the
 * button stays shut. A quote for the previous pincode or the previous
 * quantities is not an answer: it is matched by key, not by "something came
 * back once".
 *
 * Any answer the server gives is a calculated charge and opens the gate: a live
 * courier rate, a free group, the product's manual fallback charge
 * (`quoted: false`), or no delivery lines at all (a cart of hand-carried
 * products needs no shipping). Only an UNKNOWN charge — no pincode to quote
 * for, an answer still on its way, a request that failed — keeps it shut.
 *
 * mWeb and the native app share this because rule 29 makes them one checkout in
 * two frameworks; each renders the status with its own components.
 */

/** Where the delivery quote for the cart and pincode on screen stands. */
export type DeliveryQuoteStatus = 'READY' | 'NEEDS_PINCODE' | 'CALCULATING' | 'FAILED';

/** Every status that keeps the Pay button shut. */
export type DeliveryQuoteBlock = Exclude<DeliveryQuoteStatus, 'READY'>;

export interface DeliveryQuoteGateInput {
  /** The cart holds something to quote for. */
  hasItems: boolean;
  /** The delivery pincode on screen can be quoted for. */
  pincodeValid: boolean;
  /** The cart + pincode on screen, from `deliveryQuoteRequestKey`. */
  requestKey: string;
  /** The key the last settled answer was asked with; null before any answer. */
  settledKey: string | null;
  /** The last settled answer was a failure (no charge came back). */
  failed: boolean;
}

/** The localization key telling the buyer why they cannot pay yet. */
export const DELIVERY_QUOTE_BLOCK_KEYS: Record<DeliveryQuoteBlock, string> = {
  NEEDS_PINCODE: 'mweb.checkout.deliveryBlockPincode',
  CALCULATING: 'mweb.checkout.deliveryBlockCalculating',
  FAILED: 'mweb.checkout.deliveryBlockFailed',
};

/** One comparable key for "this cart, delivered to this pincode". */
export function deliveryQuoteRequestKey(items: readonly unknown[], pincode: string): string {
  return `${pincode.trim()}|${JSON.stringify(items)}`;
}

/** Where the delivery quote stands for the cart and pincode on screen. */
export function deliveryQuoteStatus(input: DeliveryQuoteGateInput): DeliveryQuoteStatus {
  // An empty cart has nothing to deliver and nothing to pay for.
  if (!input.hasItems) return 'READY';
  if (!input.pincodeValid) return 'NEEDS_PINCODE';
  // No answer yet, or the answer in hand belongs to another cart or pincode.
  if (input.settledKey !== input.requestKey) return 'CALCULATING';
  return input.failed ? 'FAILED' : 'READY';
}

/** The last answer a surface holds, and the cart + pincode it was asked for. A null quote is a failure. */
export interface SettledDeliveryQuote<Q> {
  /** The `deliveryQuoteRequestKey` the request was made with. */
  key: string;
  quote: Q | null;
}

export interface DeliveryQuoteViewInput<Q>
  extends Pick<DeliveryQuoteGateInput, 'hasItems' | 'pincodeValid' | 'requestKey'> {
  /** The last settled answer; null before any, and again after Retry clears it. */
  settled: SettledDeliveryQuote<Q> | null;
}

/**
 * What a checkout shows for the answer it holds: the quote itself, and where
 * that quote stands against the cart and pincode on screen. One reading of
 * "settled" for both surfaces' `useProductShippingQuote`.
 */
export function deliveryQuoteView<Q>(input: Readonly<DeliveryQuoteViewInput<Q>>): {
  quote: Q | null;
  status: DeliveryQuoteStatus;
} {
  const { settled } = input;
  return {
    quote: settled?.quote ?? null,
    status: deliveryQuoteStatus({
      hasItems: input.hasItems,
      pincodeValid: input.pincodeValid,
      requestKey: input.requestKey,
      settledKey: settled?.key ?? null,
      failed: settled?.quote == null,
    }),
  };
}
