import { describe, expect, it } from 'vitest';
import { buildWindowOfferSchema } from './window-offer.form';
import { windowOfferDefaults, windowOfferInput, type WindowOfferValues } from './window-offer.types';

const t = (key: string) => key;
const paths = (values: WindowOfferValues, askPax = false) => {
  const result = buildWindowOfferSchema(t, askPax).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

const proposal: WindowOfferValues = { date: '2026-12-05', start: '18:00', end: '21:00', space: '', pax: 20, model: 'PER_GUEST', rate: '450' };

describe('buildWindowOfferSchema', () => {
  it('takes a whole proposal', () => {
    expect(paths(proposal)).toEqual([]);
    expect(paths(proposal, true)).toEqual([]);
  });

  it('needs a day and a window that ends after it starts', () => {
    expect(paths({ ...proposal, date: '' })).toContain('date:venuePricing.validation.pickDate');
    expect(paths({ ...proposal, start: '6pm' })).toContain('start:venuePricing.validation.time');
    expect(paths({ ...proposal, end: '17:00' })).toContain('end:venuePricing.validation.endAfterStart');
    expect(paths({ ...proposal, end: '' })).toContain('end:venuePricing.validation.endAfterStart');
  });

  it('asks for whole guests only where the guests are asked for', () => {
    expect(paths({ ...proposal, pax: Number.NaN })).toEqual([]);
    expect(paths({ ...proposal, pax: Number.NaN }, true)).toContain('pax:venuePricing.validation.wholeNumber');
    expect(paths({ ...proposal, pax: 0 }, true)).toContain('pax:venuePricing.validation.wholeNumber');
    expect(paths({ ...proposal, pax: 2.5 }, true)).toContain('pax:venuePricing.validation.wholeNumber');
  });

  it('needs a pricing option and an amount above 0', () => {
    expect(paths({ ...proposal, model: 'HOURLY' })).toEqual(['model:availability.offers.validation.model']);
    expect(paths({ ...proposal, rate: '' })).toEqual(['rate:availability.offers.validation.rate']);
    expect(paths({ ...proposal, rate: '0' })).toEqual(['rate:availability.offers.validation.rate']);
  });
});

describe('windowOfferInput', () => {
  it('turns a whole proposal into the server input, guests floored and never negative', () => {
    const offer = windowOfferInput({ ...proposal, space: 'Court 2', pax: 12.7 });
    expect(offer).toMatchObject({ space_label: 'Court 2', pax: 12, model: 'PER_GUEST', rate: 450 });
    expect(new Date(offer?.end_at ?? '').getTime() - new Date(offer?.start_at ?? '').getTime()).toBe(3 * 3600_000);
    expect(windowOfferInput({ ...proposal, pax: Number.NaN })?.pax).toBe(0);
  });

  it('is null until the proposal is whole', () => {
    expect(windowOfferInput({ ...proposal, date: '2026-02-31' })).toBeNull();
    expect(windowOfferInput({ ...proposal, end: 'x' })).toBeNull();
    expect(windowOfferInput({ ...proposal, end: '17:00' })).toBeNull();
    expect(windowOfferInput({ ...proposal, rate: '' })).toBeNull();
  });
});

describe('windowOfferDefaults', () => {
  it('starts tomorrow evening at a flat price, with the guests given', () => {
    expect(windowOfferDefaults()).toMatchObject({ start: '18:00', end: '20:00', space: '', pax: 10, model: 'FLAT', rate: '' });
    expect(windowOfferDefaults(24).pax).toBe(24);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(windowOfferDefaults().date).toBe(
      `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`,
    );
  });
});
