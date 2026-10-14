/**
 * GST on venue food — Finance's default, a venue's own override and its GST
 * number. The bounds are the server's (FOOD_GST_LIMITS), so every boundary here
 * is the one the server refuses at. Assertions on messages are on KEYS.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FOOD_GST_LIMITS } from '@duncit/utils';

import {
  makeFoodGstinRule,
  makeFoodTaxDefaultsSchema,
  makeVenueFoodTaxRefinement,
  venueFoodTaxShape,
  type VenueFoodTaxValues,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const PCT_MESSAGE = `shell.foodTax.gstPctInvalid:${JSON.stringify({ min: FOOD_GST_LIMITS.min, max: FOOD_GST_LIMITS.max })}`;

const issuesOf = (result: { success: boolean; error?: z.ZodError }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}=${issue.message}`);

describe('makeFoodTaxDefaultsSchema', () => {
  const schema = makeFoodTaxDefaultsSchema(t);

  it('takes either mode and a whole percent typed as text, and hands back the number', () => {
    expect(schema.parse({ tax_mode: 'INCLUSIVE', gst_pct: '5' })).toEqual({ tax_mode: 'INCLUSIVE', gst_pct: 5 });
    expect(schema.parse({ tax_mode: 'EXCLUSIVE', gst_pct: 18 })).toEqual({ tax_mode: 'EXCLUSIVE', gst_pct: 18 });
  });

  it('takes both ends of the range and nothing past them', () => {
    expect(issuesOf(schema.safeParse({ tax_mode: 'INCLUSIVE', gst_pct: FOOD_GST_LIMITS.min }))).toEqual([]);
    expect(issuesOf(schema.safeParse({ tax_mode: 'INCLUSIVE', gst_pct: FOOD_GST_LIMITS.max }))).toEqual([]);
    for (const gst_pct of [FOOD_GST_LIMITS.min - 1, FOOD_GST_LIMITS.max + 1]) {
      expect(issuesOf(schema.safeParse({ tax_mode: 'INCLUSIVE', gst_pct }))).toEqual([`gst_pct=${PCT_MESSAGE}`]);
    }
  });

  it('refuses a fraction and text that is not a number with the same sentence', () => {
    for (const gst_pct of ['2.5', 'five', 12.5]) {
      expect(issuesOf(schema.safeParse({ tax_mode: 'INCLUSIVE', gst_pct }))).toEqual([`gst_pct=${PCT_MESSAGE}`]);
    }
  });

  it('refuses a mode the server does not know', () => {
    for (const tax_mode of ['', 'inclusive', 'HALF']) {
      expect(issuesOf(schema.safeParse({ tax_mode, gst_pct: 5 }))).toEqual(['tax_mode=shell.foodTax.taxModeRequired']);
    }
  });
});

describe('makeVenueFoodTaxRefinement', () => {
  const check = makeVenueFoodTaxRefinement(t);
  const venueSchema = z
    .object({ food_ordering: z.object(venueFoodTaxShape) })
    .superRefine((values, ctx) => check(values.food_ordering, ctx, ['food_ordering']));
  const issuesFor = (food_ordering: VenueFoodTaxValues) => issuesOf(venueSchema.safeParse({ food_ordering }));

  it('checks nothing while the venue follows Finance’s default, whatever is stored behind it', () => {
    expect(issuesFor({ tax_override: false, tax_mode: '', gst_pct: 'abc' })).toEqual([]);
  });

  it('accepts a whole percent in range and either mode while it overrides', () => {
    expect(issuesFor({ tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: '18' })).toEqual([]);
    expect(issuesFor({ tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 0 })).toEqual([]);
  });

  it('raises each problem on its own field under the given path', () => {
    expect(issuesFor({ tax_override: true, tax_mode: 'HALF', gst_pct: 29 })).toEqual([
      'food_ordering.tax_mode=shell.foodTax.taxModeRequired',
      `food_ordering.gst_pct=${PCT_MESSAGE}`,
    ]);
  });

  it('raises on the bare field when no path is given', () => {
    const bare = z.object(venueFoodTaxShape).superRefine((values, ctx) => check(values, ctx));
    expect(issuesOf(bare.safeParse({ tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: -1 }))).toEqual([`gst_pct=${PCT_MESSAGE}`]);
  });
});

describe('makeFoodGstinRule', () => {
  const rule = makeFoodGstinRule(t);

  it('lets a venue have none', () => {
    expect(rule.parse('')).toBe('');
    expect(rule.parse('   ')).toBe('');
  });

  it('takes a GSTIN in either case, trimmed', () => {
    expect(rule.parse(' 22abcde1234f1z5 ')).toBe('22abcde1234f1z5');
    expect(rule.parse('22ABCDE1234F1Z5')).toBe('22ABCDE1234F1Z5');
  });

  it('refuses anything that is not 15 characters with the Z in place', () => {
    for (const value of ['22ABCDE1234F1A5', '22ABCDE1234F1Z', 'GSTIN']) {
      expect(issuesOf(rule.safeParse(value))).toEqual(['=shell.foodTax.gstinInvalid']);
    }
  });
});
