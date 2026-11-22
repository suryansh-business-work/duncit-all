import { describe, expect, it } from 'vitest';
import {
  GIFT_CARD_ORDER_PAYMENT_KEYS,
  GIFT_CARD_ORDER_STATUS_KEYS,
  giftCardOrderHeadline,
  giftCardOrderSteps,
  isGiftCardOrderLive,
  type GiftCardOrderStatusFacts,
} from '../src/gift-card-orders';

const order = (over: Partial<GiftCardOrderStatusFacts> = {}): GiftCardOrderStatusFacts => ({
  delivery_mode: 'PHYSICAL',
  payment_status: 'PAID',
  fulfilment_status: 'PROCESSING',
  ...over,
});

const doneIds = (o: GiftCardOrderStatusFacts) => giftCardOrderSteps(o).filter((s) => s.done).map((s) => s.id);

describe('giftCardOrderHeadline', () => {
  it('leads with the payment until it is paid', () => {
    expect(giftCardOrderHeadline(order({ payment_status: 'PENDING' }))).toEqual({ key: 'mweb.giftCards.paymentPending', tone: 'neutral' });
    expect(giftCardOrderHeadline(order({ payment_status: 'FAILED' }))).toEqual({ key: 'mweb.giftCards.paymentFailed', tone: 'error' });
    expect(giftCardOrderHeadline(order({ payment_status: 'REFUNDED' })).key).toBe('mweb.giftCards.paymentRefunded');
  });

  it('then says where the cards are, coloured by how that went', () => {
    expect(giftCardOrderHeadline(order({ fulfilment_status: 'DELIVERED' }))).toEqual({ key: 'mweb.giftCards.orderStatusDelivered', tone: 'success' });
    expect(giftCardOrderHeadline(order({ fulfilment_status: 'NDR' })).tone).toBe('warning');
    expect(giftCardOrderHeadline(order({ fulfilment_status: 'LOST' })).tone).toBe('error');
    expect(giftCardOrderHeadline(order({ fulfilment_status: 'SHIPPED' }))).toEqual({ key: 'mweb.giftCards.orderStatusShipped', tone: 'info' });
  });

  it('words every status and payment', () => {
    expect(Object.values(GIFT_CARD_ORDER_STATUS_KEYS).every((k) => k.startsWith('mweb.giftCards.orderStatus'))).toBe(true);
    expect(Object.keys(GIFT_CARD_ORDER_PAYMENT_KEYS)).toEqual(['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
  });
});

describe('giftCardOrderSteps', () => {
  it('walks a printed order from paid to delivered', () => {
    expect(doneIds(order({ payment_status: 'PENDING' }))).toEqual(['PLACED']);
    expect(doneIds(order())).toEqual(['PLACED', 'PAID']);
    expect(doneIds(order({ fulfilment_status: 'PICKUP_SCHEDULED' }))).toEqual(['PLACED', 'PAID', 'PRINTED']);
    expect(doneIds(order({ fulfilment_status: 'NDR' }))).toEqual(['PLACED', 'PAID', 'PRINTED', 'SHIPPED']);
    expect(doneIds(order({ fulfilment_status: 'OUT_FOR_DELIVERY' }))).toEqual(['PLACED', 'PAID', 'PRINTED', 'SHIPPED', 'OUT_FOR_DELIVERY']);
    expect(giftCardOrderSteps(order({ fulfilment_status: 'DELIVERED' })).every((s) => s.done)).toBe(true);
  });

  it('has three steps for an emailed order, the last done once every card is mailed', () => {
    const digital = order({ delivery_mode: 'DIGITAL' });
    expect(giftCardOrderSteps(digital).map((s) => s.id)).toEqual(['PLACED', 'PAID', 'EMAILED']);
    expect(doneIds(digital)).toEqual(['PLACED', 'PAID']);
    expect(doneIds({ ...digital, fulfilment_status: 'DELIVERED' })).toEqual(['PLACED', 'PAID', 'EMAILED']);
  });
});

describe('isGiftCardOrderLive', () => {
  it('is live while payment settles or the cards are on their way, and at rest after', () => {
    expect(isGiftCardOrderLive(order({ payment_status: 'PENDING' }))).toBe(true);
    expect(isGiftCardOrderLive(order({ fulfilment_status: 'SHIPPED' }))).toBe(true);
    expect(isGiftCardOrderLive(order({ fulfilment_status: 'DELIVERED' }))).toBe(false);
    expect(isGiftCardOrderLive(order({ payment_status: 'FAILED' }))).toBe(false);
  });
});
