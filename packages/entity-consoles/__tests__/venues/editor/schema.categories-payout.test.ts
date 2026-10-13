import { describe, expect, it } from 'vitest';
import type { AdminCategoryValue } from '@duncit/category';
import {
  categoryLimitMessage,
  makeVenueFormSchema,
  NO_CATEGORY_LIMIT,
  UNCAPPED_FOOD_LIMITS,
} from '../../../src/venues/editor/schema';
import { venueToValues } from '../../../src/venues/editor/mappers';
import { venueRecord } from '../../fixtures';

/**
 * The two blocks the venue form shares with the owner's registration form: the
 * category rows and the payout details. What staff may leave EMPTY differs from
 * the owner's form on purpose; what a filled-in value must LOOK like does not.
 */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const valid = () => venueToValues(venueRecord);
const schemaWithLimit = (limit?: number) => makeVenueFormSchema(t, UNCAPPED_FOOD_LIMITS, limit);

/** Every message filed under a field path, in order. */
function errorsAt(values: unknown, path: string, limit?: number): string[] {
  const result = schemaWithLimit(limit).safeParse(values);
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join('.') === path).map((i) => i.message);
}

const row = (over: Partial<AdminCategoryValue> = {}): AdminCategoryValue => ({
  super_id: 'super-1',
  super_name: 'Social',
  category_id: 'cat-1',
  category_name: 'Board Games',
  sub_id: 'sub-1',
  sub_name: 'Catan Night',
  ...over,
});

const BLANK_ROW = row({ super_id: '', category_id: '', sub_id: '', super_name: '', category_name: '', sub_name: '' });

describe('makeVenueFormSchema / categories', () => {
  it('accepts several whole categories', () => {
    expect(schemaWithLimit().safeParse(valid()).success).toBe(true);
    expect(valid().categories).toHaveLength(2);
  });

  it('lets staff save a venue with no category at all', () => {
    // A category is the owner form's requirement, not staff's: a venue is often
    // registered here before anyone knows what it will host.
    expect(schemaWithLimit().safeParse({ ...valid(), categories: [] }).success).toBe(true);
  });

  it('reads a missing list as an empty one', () => {
    const { categories: _dropped, ...rest } = valid();
    const result = schemaWithLimit().safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.categories).toEqual([]);
  });

  it('does not complain about a row nobody has picked anything in', () => {
    expect(errorsAt({ ...valid(), categories: [row(), BLANK_ROW] }, 'categories.1')).toEqual([]);
  });

  it('lets a legacy row through whose ids are gone but whose names remain', () => {
    const legacy = row({ super_id: '', category_id: '', sub_id: '' });
    expect(schemaWithLimit().safeParse({ ...valid(), categories: [legacy] }).success).toBe(true);
  });

  it('refuses a row that was started and not finished, on that row', () => {
    const half = row({ sub_id: '', sub_name: '' });
    const values = { ...valid(), categories: [row(), half] };
    expect(errorsAt(values, 'categories.1')).toEqual(['directory.venueEditor.categoryIncomplete']);
    expect(errorsAt(values, 'categories.0')).toEqual([]);
  });

  it('counts a row with only a sub category as started', () => {
    const subOnly = row({ super_id: '', category_id: '' });
    expect(errorsAt({ ...valid(), categories: [subOnly] }, 'categories.0')).toEqual([
      'directory.venueEditor.categoryIncomplete',
    ]);
  });

  it('counts a row with only a middle category as started', () => {
    const middleOnly = row({ super_id: '', sub_id: '' });
    expect(errorsAt({ ...valid(), categories: [middleOnly] }, 'categories.0')).toEqual([
      'directory.venueEditor.categoryIncomplete',
    ]);
  });

  it('refuses the same sub category twice, on the later row only', () => {
    const values = {
      ...valid(),
      categories: [row(), row({ category_id: 'cat-2', category_name: 'Strategy' })],
    };
    expect(errorsAt(values, 'categories.1')).toEqual(['directory.venueEditor.categoryDuplicate']);
    expect(errorsAt(values, 'categories.0')).toEqual([]);
  });

  it('holds the list to the cap the registration config states', () => {
    const three = [row(), row({ sub_id: 'sub-2' }), row({ sub_id: 'sub-3' })];
    expect(errorsAt({ ...valid(), categories: three }, 'categories', 3)).toEqual([]);
    expect(errorsAt({ ...valid(), categories: three }, 'categories', 2)).toEqual([
      'directory.venueEditor.categoryLimitMany:{"max":2}',
    ]);
    expect(errorsAt({ ...valid(), categories: three.slice(0, 2) }, 'categories', 1)).toEqual([
      'directory.venueEditor.categoryLimitOne',
    ]);
  });

  it('runs uncapped until the config has answered', () => {
    const many = Array.from({ length: 12 }, (_unused, index) => row({ sub_id: `sub-${index}` }));
    expect(errorsAt({ ...valid(), categories: many }, 'categories', NO_CATEGORY_LIMIT)).toEqual([]);
    expect(errorsAt({ ...valid(), categories: many }, 'categories')).toEqual([]);
  });
});

describe('categoryLimitMessage', () => {
  it('says "only 1" for a cap of one and names the number otherwise', () => {
    expect(categoryLimitMessage(t, 1)).toBe('directory.venueEditor.categoryLimitOne');
    expect(categoryLimitMessage(t, 5)).toBe('directory.venueEditor.categoryLimitMany:{"max":5}');
  });
});

describe('makeVenueFormSchema / payout details', () => {
  const withBank = (over: Record<string, string>) => ({
    ...valid(),
    bank_account: { ...valid().bank_account, ...over },
  });

  it('lets staff leave every payout field empty', () => {
    const blank = withBank({
      payout_method: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      upi_id: '',
    });
    expect(schemaWithLimit().safeParse(blank).success).toBe(true);
  });

  it('holds a filled-in account number to 6–18 digits', () => {
    expect(errorsAt(withBank({ account_number: '12AB' }), 'bank_account.account_number')).toEqual([
      'directory.venueEditor.errAccountNumber',
    ]);
    expect(errorsAt(withBank({ account_number: '12345' }), 'bank_account.account_number')).toEqual([
      'directory.venueEditor.errAccountNumber',
    ]);
    expect(errorsAt(withBank({ account_number: '000123456789' }), 'bank_account.account_number')).toEqual([]);
  });

  it('upper-cases an IFSC before checking it, and refuses a malformed one', () => {
    const lower = schemaWithLimit().safeParse(withBank({ ifsc_code: 'hdfc0001234' }));
    expect(lower.success).toBe(true);
    if (lower.success) expect(lower.data.bank_account.ifsc_code).toBe('HDFC0001234');

    // The fifth character of an IFSC is always a zero.
    expect(errorsAt(withBank({ ifsc_code: 'HDFC1001234' }), 'bank_account.ifsc_code')).toEqual([
      'directory.venueEditor.errIfsc',
    ]);
  });

  it('holds a filled-in UPI id to the name@handle shape', () => {
    expect(errorsAt(withBank({ upi_id: 'not-a-upi' }), 'bank_account.upi_id')).toEqual([
      'directory.venueEditor.errUpi',
    ]);
    expect(errorsAt(withBank({ upi_id: 'thirdwave@okhdfc' }), 'bank_account.upi_id')).toEqual([]);
  });
});
