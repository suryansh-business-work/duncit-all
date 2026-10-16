import { describe, expect, it } from 'vitest';
import { makeRentalItemsSchema } from '../src/schemas';

const t = (key: string) => key;
const config = {
  rental_units: ['SLOT' as const, 'HOUR' as const],
  rental_item_limit: 2,
  rental_image_limit: 1,
  rental_rate_max: 1000,
  rental_deposit_max: 500,
  rental_stock_max: 10,
  rental_per_guest_max: 3,
  rental_terms_max: 20,
};
const schema = makeRentalItemsSchema(t, config);

const item = (over: Record<string, unknown> = {}) => ({
  id: null,
  name: 'Racket',
  description: '',
  images: [],
  unit: 'SLOT',
  rate: '100',
  deposit: '0',
  stock: '4',
  per_guest_limit: '2',
  is_available: true,
  ...over,
});

const issues = (values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

describe('makeRentalItemsSchema', () => {
  it('accepts a listed item and coerces its numbers', () => {
    const result = schema.parse({ offers_rentals: true, rental_terms_html: '', items: [item()] });
    expect(result.items[0]).toMatchObject({ rate: 100, deposit: 0, stock: 4, per_guest_limit: 2 });
  });

  it('refuses what the server would: a missing name, a fractional or out-of-range number, too many photos', () => {
    expect(issues({ offers_rentals: true, rental_terms_html: '', items: [item({ name: ' ' })] })).toEqual([
      'items.0.name:venueRentals.items.nameRequired',
    ]);
    expect(issues({ offers_rentals: true, rental_terms_html: '', items: [item({ rate: '1.5' })] })).toEqual([
      'items.0.rate:venueRentals.items.wholeInvalid',
    ]);
    expect(issues({ offers_rentals: true, rental_terms_html: '', items: [item({ deposit: '501' })] })).toEqual([
      'items.0.deposit:venueRentals.items.wholeInvalid',
    ]);
    expect(issues({ offers_rentals: true, rental_terms_html: '', items: [item({ images: ['a', 'b'] })] })).toEqual([
      'items.0.images:venueRentals.items.tooManyPhotos',
    ]);
  });

  it('will not let one guest rent more units than the venue has', () => {
    expect(
      issues({ offers_rentals: true, rental_terms_html: '', items: [item({ stock: '2', per_guest_limit: '3' })] })
    ).toEqual(['items.0.per_guest_limit:venueRentals.items.perGuestOverStock']);
  });

  it('caps the list and the venue terms at the configured limits', () => {
    expect(issues({ offers_rentals: true, rental_terms_html: '', items: [item(), item(), item()] })).toEqual([
      'items:venueRentals.items.tooManyItems',
    ]);
    expect(issues({ offers_rentals: true, rental_terms_html: 'x'.repeat(21), items: [] })).toEqual([
      'rental_terms_html:venueRentals.items.termsTooLong',
    ]);
  });
});
