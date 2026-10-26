import { describe, expect, it } from 'vitest';
import { asksMinGuests, counterQuoteTermsOf, counterTermsOf, type CounterOfferValues } from './counter-offer.types';

const values = (over: Partial<CounterOfferValues> = {}): CounterOfferValues => ({
  model: 'PER_GUEST',
  rate: '450',
  min_guests: '12',
  offerings: '- 10 chairs\n\n• A projector ',
  note: '',
  images: [],
  ...over,
});

describe('asksMinGuests', () => {
  it('asks for the fewest guests only on a per-guest price', () => {
    expect(asksMinGuests('PER_GUEST')).toBe(true);
    for (const model of ['PER_HOUR', 'FLAT', '']) expect(asksMinGuests(model)).toBe(false);
  });
});

describe('counterTermsOf', () => {
  it('carries a per-guest counter with its minimum and its points, cleaned', () => {
    expect(counterTermsOf(values())).toEqual({ model: 'PER_GUEST', rate: 450, min_guests: 12, offerings: ['10 chairs', 'A projector'] });
  });

  it('sends no minimum with any other pricing option, whatever was typed before switching', () => {
    expect(counterTermsOf(values({ model: 'FLAT', rate: ' 9000 ', min_guests: '12' }))).toEqual({
      model: 'FLAT',
      rate: 9000,
      offerings: ['10 chairs', 'A projector'],
    });
    expect(counterTermsOf(values({ model: 'PER_HOUR', min_guests: 'abc' }))).toEqual({
      model: 'PER_HOUR',
      rate: 450,
      offerings: ['10 chairs', 'A projector'],
    });
  });

  it('leaves the minimum on the table when the box is empty', () => {
    expect(counterTermsOf(values({ min_guests: '', offerings: '' }))).toEqual({ model: 'PER_GUEST', rate: 450, offerings: [] });
  });

  it('carries the photos attached, as their own copy, and none when there are none', () => {
    const images = ['https://ik.imagekit.io/duncit/chat/setup.jpg'];
    const terms = counterTermsOf(values({ model: 'FLAT', images }));
    expect(terms?.images).toEqual(images);
    expect(terms?.images).not.toBe(images);
    expect(counterTermsOf(values({ model: 'FLAT' }))).not.toHaveProperty('images');
  });

  it('is null until the amount can be priced', () => {
    for (const rate of ['', '0', '-1', 'abc']) expect(counterTermsOf(values({ rate }))).toBeNull();
  });

  it('is null while a per-guest minimum is not a whole number of at least one', () => {
    for (const min_guests of ['0', '2.5', 'abc']) expect(counterTermsOf(values({ min_guests }))).toBeNull();
  });
});

describe('counterQuoteTermsOf', () => {
  it('prices the option, the amount and the minimum — never the points', () => {
    expect(counterQuoteTermsOf(values())).toEqual({ model: 'PER_GUEST', rate: 450, min_guests: 12 });
    expect(counterQuoteTermsOf(values({ model: 'PER_HOUR', rate: '5000' }))).toEqual({ model: 'PER_HOUR', rate: 5000 });
  });

  it('asks the same price whatever points, note or photos are typed', () => {
    const one = counterQuoteTermsOf(values({ model: 'FLAT', rate: '7000', offerings: 'A stage', note: 'Weekend', images: ['https://ik.imagekit.io/a.jpg'] }));
    const other = counterQuoteTermsOf(values({ model: 'FLAT', rate: '7000', offerings: 'Two mics\nA stage', note: '' }));
    expect(JSON.stringify(one)).toBe(JSON.stringify(other));
    expect(one).toEqual({ model: 'FLAT', rate: 7000 });
  });

  it('asks nothing until the terms can be priced', () => {
    expect(counterQuoteTermsOf(values({ rate: '0' }))).toBeNull();
    expect(counterQuoteTermsOf(values({ min_guests: '-3' }))).toBeNull();
  });
});
