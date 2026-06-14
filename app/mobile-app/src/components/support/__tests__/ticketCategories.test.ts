import { categoryLabel, toServerCategory } from '@/components/support/ticketCategories';

describe('ticketCategories', () => {
  it('maps known friendly categories to the server enum', () => {
    expect(toServerCategory('BUG')).toBe('TECHNICAL');
    expect(toServerCategory('PAYMENT')).toBe('PAYMENT');
    expect(toServerCategory('QUESTION')).toBe('GENERAL');
  });

  it('falls back to OTHER for an unknown category', () => {
    expect(toServerCategory('NOPE')).toBe('OTHER');
  });

  it('returns the friendly label, or the raw value when unknown', () => {
    expect(categoryLabel('QUESTION')).toBe('Question / How do I…');
    expect(categoryLabel('NOPE')).toBe('NOPE');
  });
});
