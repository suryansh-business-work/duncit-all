/**
 * What a guest types to order food at a venue — one schema for mWeb's cart
 * sheet and the native one. Its limits are the server's (FOOD_ORDER_LIMITS),
 * so every boundary here is the one the server would refuse at. Assertions on
 * messages are on KEYS: a literal sentence reappearing here is the regression.
 */
import { describe, expect, it } from 'vitest';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';

import { foodCheckoutDefaults, makeFoodCheckoutSchema } from '../src/schemas';

/** Records the interpolation too, so a "too long" message can be checked for the limit it states. */
const t = (key: string, options?: { vars?: Record<string, string> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeFoodCheckoutSchema(t);

const VALID = { name: 'Asha Rao', phone: '9876543210', table: 'T4', note: 'Less spicy', subscribe: false };

const issuesFor = (values: Partial<typeof VALID>) => {
  const result = schema.safeParse({ ...VALID, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeFoodCheckoutSchema', () => {
  it('accepts a full set of details and trims every field', () => {
    expect(
      schema.parse({ name: '  Asha Rao ', phone: ' 9876543210 ', table: ' T4 ', note: '  Less spicy ', subscribe: false }),
    ).toEqual(VALID);
  });

  it('lets the table and the note stay empty', () => {
    expect(schema.parse({ ...VALID, table: '', note: '   ' })).toEqual({ ...VALID, table: '', note: '' });
  });

  it('refuses a missing or one-letter name, counting only what is left after trimming', () => {
    for (const name of ['', '   ', 'A', ' A ']) {
      expect(issuesFor({ name })).toEqual(['name=mweb.venueFood.checkout.nameRequired']);
    }
    expect(issuesFor({ name: 'Al' })).toEqual([]);
  });

  it('holds the name to the server limit and states that limit', () => {
    expect(issuesFor({ name: 'a'.repeat(FOOD_ORDER_LIMITS.nameMax) })).toEqual([]);
    expect(issuesFor({ name: 'a'.repeat(FOOD_ORDER_LIMITS.nameMax + 1) })).toEqual([
      `name=mweb.venueFood.checkout.nameTooLong:{"max":"${FOOD_ORDER_LIMITS.nameMax}"}`,
    ]);
  });

  it('takes exactly ten digits for the mobile number', () => {
    for (const phone of ['', '987654321', '98765432100', '98765 43210', '+919876543210', '98765abcde']) {
      expect(issuesFor({ phone })).toEqual(['phone=mweb.venueFood.checkout.phoneInvalid']);
    }
    expect(issuesFor({ phone: '0123456789' })).toEqual([]);
  });

  it('holds the table and the note to their limits and states them', () => {
    expect(issuesFor({ table: 'x'.repeat(FOOD_ORDER_LIMITS.tableMax), note: 'y'.repeat(FOOD_ORDER_LIMITS.noteMax) })).toEqual([]);
    expect(
      issuesFor({ table: 'x'.repeat(FOOD_ORDER_LIMITS.tableMax + 1), note: 'y'.repeat(FOOD_ORDER_LIMITS.noteMax + 1) }),
    ).toEqual([
      `table=mweb.venueFood.checkout.tableTooLong:{"max":"${FOOD_ORDER_LIMITS.tableMax}"}`,
      `note=mweb.venueFood.checkout.noteTooLong:{"max":"${FOOD_ORDER_LIMITS.noteMax}"}`,
    ]);
  });

  it('reports every broken field at once', () => {
    expect(issuesFor({ name: '', phone: '12' })).toEqual([
      'name=mweb.venueFood.checkout.nameRequired',
      'phone=mweb.venueFood.checkout.phoneInvalid',
    ]);
  });

  it('starts empty, which is not yet a valid order', () => {
    expect(foodCheckoutDefaults).toEqual({ name: '', phone: '', table: '', note: '', subscribe: false });
    expect(schema.safeParse(foodCheckoutDefaults).success).toBe(false);
  });

  // The events subscription is a consent: carried as ticked or not, never demanded.
  it('carries the events subscription exactly as it was ticked', () => {
    expect(schema.parse({ ...VALID, subscribe: true }).subscribe).toBe(true);
    expect(schema.parse({ ...VALID, subscribe: false }).subscribe).toBe(false);
  });

  it('refuses a subscription that is not a yes or a no', () => {
    expect(schema.safeParse({ ...VALID, subscribe: 'yes' }).success).toBe(false);
  });
});
