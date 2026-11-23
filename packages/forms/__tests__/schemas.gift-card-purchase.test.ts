import { describe, expect, it } from 'vitest';
import {
  canOrderPhysical,
  giftCardPurchaseDefaults,
  giftCardPurchaseRecipient,
  giftCardPurchaseTotals,
  makeGiftCardPurchaseSchema,
  maxQuantityFor,
  type GiftCardPurchasePolicy,
  type GiftCardPurchaseValues,
} from '../src/schemas';

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;

const policy = (over: Partial<GiftCardPurchasePolicy> = {}): GiftCardPurchasePolicy => ({
  min_amount: 100,
  max_amount: 10000,
  max_quantity: 10,
  physical_enabled: true,
  physical_available: 4,
  shipping_fee: 99,
  ...over,
});

const values = (over: Partial<GiftCardPurchaseValues> = {}): GiftCardPurchaseValues => ({
  amount: '500',
  quantity: '1',
  delivery_mode: 'DIGITAL',
  gift: false,
  recipient_email: '',
  recipient_name: '',
  message: '',
  ...over,
});

const errorsOf = (v: GiftCardPurchaseValues, p = policy()) => {
  const r = makeGiftCardPurchaseSchema(t, p).safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('makeGiftCardPurchaseSchema', () => {
  it('accepts a card kept for yourself and a digital gift with an email', () => {
    expect(errorsOf(values())).toEqual({});
    expect(errorsOf(values({ gift: true, recipient_email: 'friend@x.com', quantity: '10' }))).toEqual({});
  });

  it.each([['99'], ['10001'], ['250.5'], ['']])('refuses an amount of %j outside the policy', (amount) => {
    expect(errorsOf(values({ amount }))).toEqual({ amount: 'mweb.giftCards.amountRangeHint({"min":100,"max":10000})' });
  });

  it.each([['0'], ['11'], ['1.5']])('refuses a quantity of %j for email delivery', (quantity) => {
    expect(errorsOf(values({ quantity }))).toEqual({ quantity: 'mweb.giftCards.quantityRange({"max":10})' });
  });

  it('caps a printed order by the stock left', () => {
    expect(errorsOf(values({ delivery_mode: 'PHYSICAL', quantity: '4' }))).toEqual({});
    expect(errorsOf(values({ delivery_mode: 'PHYSICAL', quantity: '5' }))).toEqual({
      quantity: 'mweb.giftCards.quantityRange({"max":4})',
    });
  });

  it('refuses printed cards while they are off or out of stock', () => {
    expect(errorsOf(values({ delivery_mode: 'PHYSICAL' }), policy({ physical_enabled: false }))).toEqual({
      delivery_mode: 'mweb.giftCards.physicalUnavailable',
    });
    expect(errorsOf(values({ delivery_mode: 'PHYSICAL' }), policy({ physical_available: 0 }))).toEqual({
      delivery_mode: 'mweb.giftCards.physicalUnavailable',
    });
  });

  it('asks for a valid email only when a digital card is a gift', () => {
    expect(errorsOf(values({ gift: true, recipient_email: 'not-an-email' }))).toEqual({
      recipient_email: 'mweb.auth.validation.emailInvalid',
    });
    expect(errorsOf(values({ delivery_mode: 'PHYSICAL', gift: true, recipient_email: '' }))).toEqual({});
  });

  it('keeps the personal message within 300 characters', () => {
    expect(errorsOf(values({ message: 'm'.repeat(301) }))).toEqual({ message: 'mweb.giftCards.messageMax({"max":300})' });
  });
});

describe('purchase helpers', () => {
  it('knows when printed cards can be ordered, and the quantity cap for each mode', () => {
    expect(canOrderPhysical(policy())).toBe(true);
    expect(canOrderPhysical(policy({ physical_available: 0 }))).toBe(false);
    expect(maxQuantityFor(policy(), 'DIGITAL')).toBe(10);
    expect(maxQuantityFor(policy(), 'PHYSICAL')).toBe(4);
    expect(maxQuantityFor(policy({ max_quantity: 0, physical_available: 0 }), 'PHYSICAL')).toBe(1);
  });

  it('starts at the first preset inside the bounds, or blank when none fits', () => {
    expect(giftCardPurchaseDefaults([50, 500, 1000], policy())).toEqual(values());
    expect(giftCardPurchaseDefaults([50], policy()).amount).toBe('');
  });

  it('charges the delivery fee once on a printed order, never on email', () => {
    expect(giftCardPurchaseTotals({ amount: '500', quantity: '3', delivery_mode: 'PHYSICAL' }, 99)).toEqual({
      amount: 500,
      quantity: 3,
      cardsValue: 1500,
      shippingFee: 99,
      total: 1599,
    });
    expect(giftCardPurchaseTotals({ amount: '500', quantity: '3', delivery_mode: 'DIGITAL' }, 99).total).toBe(1500);
    expect(giftCardPurchaseTotals({ amount: 'abc', quantity: '', delivery_mode: 'DIGITAL' }, 99)).toMatchObject({
      amount: 0,
      quantity: 1,
      total: 0,
    });
  });

  it('names a recipient only when the card goes to one', () => {
    const typed = { recipient_email: ' friend@x.com ', recipient_name: ' Priya ', message: ' Enjoy ' };
    expect(giftCardPurchaseRecipient(values({ gift: true, ...typed }))).toEqual({
      recipient_email: 'friend@x.com',
      recipient_name: 'Priya',
      message: 'Enjoy',
    });
    expect(giftCardPurchaseRecipient(values({ gift: false, ...typed }))).toEqual({ recipient_email: '', recipient_name: '', message: '' });
    expect(giftCardPurchaseRecipient(values({ delivery_mode: 'PHYSICAL', gift: true, ...typed }))).toEqual({
      recipient_email: '',
      recipient_name: 'Priya',
      message: 'Enjoy',
    });
  });
});
