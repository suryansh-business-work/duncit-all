import { describe, expect, it } from 'vitest';
import {
  VENUE_KIT_FALLBACK_OFFER,
  VENUE_KIT_FEATURES,
  resolveVenueKitOffer,
  venueKitCopyVars,
  venueKitPercent,
  venueKitRupees,
} from '../src/venue-kit';

describe('venueKitRupees', () => {
  it('turns paise into whole rupees with Indian grouping', () => {
    expect(venueKitRupees(999_900)).toBe('₹9,999');
    expect(venueKitRupees(10_000)).toBe('₹100');
    expect(venueKitRupees(12_500_000)).toBe('₹1,25,000');
    expect(venueKitRupees(0)).toBe('₹0');
  });

  it('rounds a stray fraction of a paisa rather than printing it', () => {
    expect(venueKitRupees(10_000.4)).toBe('₹100');
  });
});

describe('venueKitPercent', () => {
  it('drops a needless decimal but keeps a real one', () => {
    expect(venueKitPercent(1)).toBe('1%');
    expect(venueKitPercent(10)).toBe('10%');
    expect(venueKitPercent(1.5)).toBe('1.5%');
    expect(venueKitPercent(2.125)).toBe('2.13%');
  });
});

describe('resolveVenueKitOffer', () => {
  it('falls back to the shipped plan when the API answered nothing', () => {
    expect(resolveVenueKitOffer(null)).toEqual(VENUE_KIT_FALLBACK_OFFER);
    expect(resolveVenueKitOffer(undefined)).toEqual(VENUE_KIT_FALLBACK_OFFER);
  });

  it('keeps every valid number the server sent', () => {
    const saved = { ...VENUE_KIT_FALLBACK_OFFER, annual_price_paise: 1_199_900, included_table_labels: 30, order_benefit_pct: 1.5 };
    expect(resolveVenueKitOffer(saved)).toEqual(saved);
  });

  it('fills a missing, negative, non-finite or non-number field from the fallback, field by field', () => {
    const resolved = resolveVenueKitOffer({
      annual_price_paise: 1_499_900,
      included_table_labels: -3,
      gift_card_count: Number.NaN,
      gift_card_value_paise: '100' as unknown as number,
      order_benefit_pct: Number.POSITIVE_INFINITY,
    });
    expect(resolved).toEqual({ ...VENUE_KIT_FALLBACK_OFFER, annual_price_paise: 1_499_900 });
  });

  it('accepts zero as a real value (a free extra label is a valid plan)', () => {
    expect(resolveVenueKitOffer({ extra_label_price_paise: 0 }).extra_label_price_paise).toBe(0);
  });

  it('never mutates the fallback it copies', () => {
    resolveVenueKitOffer({ annual_price_paise: 1 });
    expect(VENUE_KIT_FALLBACK_OFFER.annual_price_paise).toBe(999_900);
  });
});

describe('venueKitCopyVars', () => {
  it('derives every value the copy interpolates from the launch plan', () => {
    expect(venueKitCopyVars(VENUE_KIT_FALLBACK_OFFER)).toEqual({
      price: '₹9,999',
      labels: 25,
      extraLabelPrice: '₹100',
      posMonths: 12,
      giftCards: 10,
      giftCardValue: '₹100',
      giftCardTotal: '₹1,000',
      collabDiscount: '10%',
      orderBenefit: '1%',
    });
  });

  it('recomputes the gift card total from count and value', () => {
    const vars = venueKitCopyVars({ ...VENUE_KIT_FALLBACK_OFFER, gift_card_count: 20, gift_card_value_paise: 25_000 });
    expect(vars).toMatchObject({ giftCards: 20, giftCardValue: '₹250', giftCardTotal: '₹5,000' });
  });
});

describe('VENUE_KIT_FEATURES', () => {
  it('lists the seven features once each, in the announced order', () => {
    expect(VENUE_KIT_FEATURES).toEqual(['tableLabels', 'counterStandee', 'smartPos', 'freeGiftCards', 'collabGiftCards', 'razorpay', 'orderBenefit']);
    expect(new Set(VENUE_KIT_FEATURES).size).toBe(7);
  });
});
