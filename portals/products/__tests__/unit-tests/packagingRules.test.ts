import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  catalogueRules,
  type CatalogueRuleValues,
} from '../../src/pages/inventory-page/inventory-product-page/packagingRules';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${options.vars.min}-${options.vars.max}` : key;

const valid: CatalogueRuleValues = {
  brand_name: 'Acme',
  delivery_target: 'SHIPROCKET',
  hsn_code: '2309',
  shelf_life_days: 30,
  mrp: 200,
  unit_cost: 150,
  weight_kg: 1,
  length_cm: 10,
  breadth_cm: 10,
  height_cm: 10,
};

/** Runs the refinement and returns { path: message } for every issue it raised. */
const issuesFor = (over: Partial<CatalogueRuleValues>): Record<string, string> => {
  const found: Record<string, string> = {};
  const ctx = {
    addIssue: (issue: { path: string[]; message: string }) => {
      found[issue.path[0]] = issue.message;
    },
  } as unknown as z.RefinementCtx<CatalogueRuleValues>;
  catalogueRules(t)({ ...valid, ...over }, ctx);
  return found;
};

describe('catalogueRules', () => {
  it('accepts a complete ShipRocket product', () => {
    expect(issuesFor({})).toEqual({});
  });

  it('requires a brand', () => {
    expect(issuesFor({ brand_name: '   ' })).toEqual({ brand_name: 'products.validation.brandRequired' });
  });

  it('names every missing packed dimension and the HSN code when ShipRocket rates the parcel', () => {
    expect(issuesFor({ weight_kg: 0, length_cm: 0, breadth_cm: 0, height_cm: 0, hsn_code: '' })).toEqual({
      weight_kg: 'products.validation.weightRequired',
      length_cm: 'products.validation.lengthRequired',
      breadth_cm: 'products.validation.breadthRequired',
      height_cm: 'products.validation.heightRequired',
      hsn_code: 'products.validation.hsnRequired',
    });
  });

  it('allows blank dimensions and HSN for products that do not ship through ShipRocket', () => {
    expect(
      issuesFor({ delivery_target: 'PICKUP', weight_kg: 0, length_cm: 0, breadth_cm: 0, height_cm: 0, hsn_code: ' ' }),
    ).toEqual({});
  });

  it('still range-checks a dimension that was filled in for a non-ShipRocket product', () => {
    expect(issuesFor({ delivery_target: 'PICKUP', weight_kg: 51 })).toEqual({
      weight_kg: 'products.validation.weightRange:0.05-50',
    });
  });

  it('enforces the weight and side limits on both ends, inclusive', () => {
    expect(issuesFor({ weight_kg: 0.01 }).weight_kg).toBe('products.validation.weightRange:0.05-50');
    expect(issuesFor({ weight_kg: 50.5 }).weight_kg).toBe('products.validation.weightRange:0.05-50');
    expect(issuesFor({ weight_kg: 0.05, length_cm: 0.5, breadth_cm: 300, height_cm: 300 })).toEqual({});
    expect(issuesFor({ length_cm: 0.4 }).length_cm).toBe('products.validation.sideRange:0.5-300');
    expect(issuesFor({ height_cm: 301 }).height_cm).toBe('products.validation.sideRange:0.5-300');
  });

  it('treats a non-numeric dimension as blank', () => {
    expect(issuesFor({ weight_kg: 'abc' as unknown as number }).weight_kg).toBe('products.validation.weightRequired');
  });

  it('validates the HSN code as 4 to 8 digits', () => {
    expect(issuesFor({ hsn_code: '230' }).hsn_code).toBe('products.validation.hsnFormat');
    expect(issuesFor({ hsn_code: '123456789' }).hsn_code).toBe('products.validation.hsnFormat');
    expect(issuesFor({ hsn_code: '23AB' }).hsn_code).toBe('products.validation.hsnFormat');
    expect(issuesFor({ hsn_code: ' 23091010 ' })).toEqual({});
  });

  it('accepts no shelf life or whole days, and rejects fractions and negatives', () => {
    expect(issuesFor({ shelf_life_days: null })).toEqual({});
    expect(issuesFor({ shelf_life_days: 0 })).toEqual({});
    expect(issuesFor({ shelf_life_days: 1.5 }).shelf_life_days).toBe('products.validation.shelfLife');
    expect(issuesFor({ shelf_life_days: -1 }).shelf_life_days).toBe('products.validation.shelfLife');
  });

  it('holds MRP at or above the selling price, and lets a blank MRP through', () => {
    expect(issuesFor({ mrp: 100, unit_cost: 150 }).mrp).toBe('products.validation.mrpBelowPrice');
    expect(issuesFor({ mrp: 150, unit_cost: 150 })).toEqual({});
    expect(issuesFor({ mrp: 0, unit_cost: 150 })).toEqual({});
    expect(issuesFor({ mrp: 100, unit_cost: 'x' as unknown as number })).toEqual({});
  });
});
