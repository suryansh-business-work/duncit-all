import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { listingRules } from './list-products.rules';

type Values = Parameters<ReturnType<typeof listingRules>>[0];

/** Runs the rules over `values` and answers the issues they raised as [path, message]. */
const issuesOf = (over: Record<string, unknown> = {}, variants: Record<string, unknown>[] = [{ unit_cost: 100, mrp: 150 }]) => {
  const issues: [string, string][] = [];
  const ctx = {
    addIssue: (issue: { path: (string | number)[]; message: string }) => issues.push([issue.path.join('.'), issue.message]),
  } as unknown as z.RefinementCtx<Values>;
  const values = {
    delivery_target: 'HOST',
    hsn_code: '',
    shelf_life_days: null,
    height_cm: '',
    weight_kg: '',
    length_cm: '',
    breadth_cm: '',
    variants,
    ...over,
  } as unknown as Values;
  listingRules((key) => key)(values, ctx);
  return issues;
};

describe('listingRules shelf life', () => {
  it('accepts no shelf life, and a whole number of days from zero', () => {
    expect(issuesOf({ shelf_life_days: null })).toEqual([]);
    expect(issuesOf({ shelf_life_days: 0 })).toEqual([]);
    expect(issuesOf({ shelf_life_days: 365 })).toEqual([]);
  });

  it('refuses a negative or a fractional number of days on the field', () => {
    expect(issuesOf({ shelf_life_days: -1 })).toEqual([['shelf_life_days', 'partners.listProductsPage.shelfLife']]);
    expect(issuesOf({ shelf_life_days: 1.5 })).toEqual([['shelf_life_days', 'partners.listProductsPage.shelfLife']]);
  });
});

describe('listingRules MRP', () => {
  it('lets an MRP sit at or above the price, or be left unset', () => {
    expect(issuesOf({}, [{ unit_cost: 100, mrp: 100 }])).toEqual([]);
    expect(issuesOf({}, [{ unit_cost: 100, mrp: 0 }])).toEqual([]);
    expect(issuesOf({}, [{ unit_cost: 100, mrp: '' }])).toEqual([]);
  });

  it('refuses an MRP below the price, on that variant', () => {
    expect(issuesOf({}, [{ unit_cost: 100, mrp: 150 }, { unit_cost: 100, mrp: 80 }])).toEqual([
      ['variants.1.mrp', 'partners.listProductsPage.mrpBelowPrice'],
    ]);
  });

  it('compares against a price of zero when the variant has none yet', () => {
    expect(issuesOf({}, [{ unit_cost: '', mrp: 10 }])).toEqual([]);
  });
});

describe('the shelf life field of the listing schema', () => {
  it('reads a typed number of days, and blank as no shelf life', async () => {
    const { productListingSchema } = await import('./list-products.schema');
    expect(productListingSchema.shape.shelf_life_days.parse('30')).toBe(30);
    expect(productListingSchema.shape.shelf_life_days.parse('')).toBeNull();
    expect(productListingSchema.shape.shelf_life_days.parse(null)).toBeNull();
  });
});
