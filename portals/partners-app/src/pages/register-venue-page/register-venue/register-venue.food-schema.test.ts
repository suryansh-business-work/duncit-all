import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fallbackT } from '@duncit/shell';
import { makeFoodRefinement } from './register-venue.food-schema';
import { blankRegisterVenueValues, NO_FOOD_LIMITS, type RegisterVenueValues } from './register-venue.types';

const schema = z.custom<RegisterVenueValues>().superRefine(makeFoodRefinement(fallbackT, NO_FOOD_LIMITS));

const issuesOf = (over: Partial<RegisterVenueValues>) =>
  (schema.safeParse({ ...blankRegisterVenueValues, ...over }).error?.issues ?? []).map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));

describe('makeFoodRefinement — the GST number on the food invoices', () => {
  it('refuses a malformed GST number while the venue serves food, on the food_gstin field', () => {
    expect(issuesOf({ offers_food: true, food_gstin: 'NOT-A-GSTIN' })).toEqual([
      { path: ['food_gstin'], message: 'Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5.' },
    ]);
  });

  it('takes a well-formed GST number, in any case, and a blank one', () => {
    expect(issuesOf({ offers_food: true, food_gstin: '22abcde1234f1z5' })).toEqual([]);
    expect(issuesOf({ offers_food: true, food_gstin: '' })).toEqual([]);
  });

  it('checks nothing while the venue serves no food, however the number reads', () => {
    expect(issuesOf({ offers_food: false, food_gstin: 'NOT-A-GSTIN' })).toEqual([]);
  });
});
