import { describe, expect, it } from 'vitest';
import {
  DELIVERY_QUOTE_BLOCK_KEYS,
  deliveryQuoteRequestKey,
  deliveryQuoteStatus,
  deliveryQuoteView,
  type DeliveryQuoteGateInput,
} from '../src/delivery-quote-gate';

const items = [{ product_id: 'tee', pod_id: 'pod1', quantity: 2 }];
const key = deliveryQuoteRequestKey(items, '560001');

/** A checkout whose quote for the cart on screen has arrived; each test breaks one fact. */
const gate = (over: Partial<DeliveryQuoteGateInput> = {}): DeliveryQuoteGateInput => ({
  hasItems: true,
  pincodeValid: true,
  requestKey: key,
  settledKey: key,
  failed: false,
  ...over,
});

describe('DELIVERY_QUOTE_BLOCK_KEYS', () => {
  it('maps every blocking status to its mweb.checkout key, and READY to none', () => {
    // Both surfaces render t(DELIVERY_QUOTE_BLOCK_KEYS[status]) under the Pay
    // button; a renamed entry would show the buyer a raw key instead of a reason.
    expect(DELIVERY_QUOTE_BLOCK_KEYS).toEqual({
      NEEDS_PINCODE: 'mweb.checkout.deliveryBlockPincode',
      CALCULATING: 'mweb.checkout.deliveryBlockCalculating',
      FAILED: 'mweb.checkout.deliveryBlockFailed',
    });
  });
});

describe('deliveryQuoteRequestKey', () => {
  it('is the same for the same cart and pincode', () => {
    expect(deliveryQuoteRequestKey([{ product_id: 'tee', pod_id: 'pod1', quantity: 2 }], '560001')).toBe(key);
  });

  it('changes when the pincode changes', () => {
    expect(deliveryQuoteRequestKey(items, '110001')).not.toBe(key);
  });

  it('changes when a quantity changes or a line is added', () => {
    expect(deliveryQuoteRequestKey([{ ...items[0], quantity: 3 }], '560001')).not.toBe(key);
    expect(
      deliveryQuoteRequestKey([...items, { product_id: 'mug', pod_id: 'pod1', quantity: 1 }], '560001'),
    ).not.toBe(key);
  });

  it('ignores whitespace around the pincode, which the form does not strip while typing', () => {
    expect(deliveryQuoteRequestKey(items, '  560001 ')).toBe(key);
  });
});

describe('deliveryQuoteStatus', () => {
  it('is READY once the answer for the cart and pincode on screen has arrived', () => {
    expect(deliveryQuoteStatus(gate())).toBe('READY');
  });

  it('is READY for an empty cart, whatever else is true — there is nothing to deliver', () => {
    expect(
      deliveryQuoteStatus(gate({ hasItems: false, pincodeValid: false, settledKey: null, failed: true })),
    ).toBe('READY');
  });

  it('asks for a pincode before anything can be quoted, even with an older answer in hand', () => {
    expect(deliveryQuoteStatus(gate({ pincodeValid: false }))).toBe('NEEDS_PINCODE');
    expect(deliveryQuoteStatus(gate({ pincodeValid: false, settledKey: null }))).toBe('NEEDS_PINCODE');
  });

  it('is CALCULATING until the first answer arrives', () => {
    expect(deliveryQuoteStatus(gate({ settledKey: null }))).toBe('CALCULATING');
  });

  it('is CALCULATING again when the pincode changes — the answer in hand is for the old one', () => {
    const next = deliveryQuoteRequestKey(items, '110001');
    expect(deliveryQuoteStatus(gate({ requestKey: next }))).toBe('CALCULATING');
  });

  it('is CALCULATING again when a quantity changes — the answer in hand is for the old cart', () => {
    const next = deliveryQuoteRequestKey([{ ...items[0], quantity: 5 }], '560001');
    expect(deliveryQuoteStatus(gate({ requestKey: next }))).toBe('CALCULATING');
  });

  it('does not report an old failure against a new cart: it is calculating, not failed', () => {
    const next = deliveryQuoteRequestKey(items, '110001');
    expect(deliveryQuoteStatus(gate({ requestKey: next, failed: true }))).toBe('CALCULATING');
  });

  it('is FAILED when the request for the cart and pincode on screen came back with no charge', () => {
    expect(deliveryQuoteStatus(gate({ failed: true }))).toBe('FAILED');
  });
});

describe('deliveryQuoteView', () => {
  const quote = { total: 60 };
  const screen = { hasItems: true, pincodeValid: true, requestKey: key };

  it('has no quote and is CALCULATING before any answer, and again after Retry clears it', () => {
    expect(deliveryQuoteView({ ...screen, settled: null })).toEqual({ quote: null, status: 'CALCULATING' });
  });

  it('hands back the quote, READY, when the answer is for the cart and pincode on screen', () => {
    expect(deliveryQuoteView({ ...screen, settled: { key, quote } })).toEqual({ quote, status: 'READY' });
  });

  it('is FAILED with no quote when the request for what is on screen came back empty', () => {
    expect(deliveryQuoteView({ ...screen, settled: { key, quote: null } })).toEqual({
      quote: null,
      status: 'FAILED',
    });
  });

  it('keeps the previous quote in hand while the new pincode is still CALCULATING', () => {
    const next = deliveryQuoteRequestKey(items, '110001');
    expect(deliveryQuoteView({ ...screen, requestKey: next, settled: { key, quote } })).toEqual({
      quote,
      status: 'CALCULATING',
    });
  });

  it('asks for a pincode, and is READY for an empty cart, whatever answer is in hand', () => {
    expect(deliveryQuoteView({ ...screen, pincodeValid: false, settled: { key, quote } }).status).toBe(
      'NEEDS_PINCODE',
    );
    expect(deliveryQuoteView({ ...screen, hasItems: false, settled: null }).status).toBe('READY');
  });
});
