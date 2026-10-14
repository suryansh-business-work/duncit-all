/**
 * The reason a venue owner gives before a paid food order is cancelled and
 * refunded — one rule for the MUI dialog and the native sheet.
 */
import { describe, expect, it } from 'vitest';

import {
  FOOD_CANCEL_REASON_MAX,
  FOOD_CANCEL_REASON_MIN,
  foodOrderCancelDefaults,
  makeFoodOrderCancelSchema,
} from '../src/schemas';

const t = (key: string) => key;
const schema = makeFoodOrderCancelSchema(t);

const messagesFor = (reason: string) => {
  const result = schema.safeParse({ reason });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeFoodOrderCancelSchema', () => {
  it('accepts a reason within the server’s bounds, trimmed', () => {
    expect(schema.parse({ reason: '  Kitchen closed early  ' })).toEqual({ reason: 'Kitchen closed early' });
    expect(messagesFor('x'.repeat(FOOD_CANCEL_REASON_MIN))).toEqual([]);
    expect(messagesFor('x'.repeat(FOOD_CANCEL_REASON_MAX))).toEqual([]);
  });

  it('refuses a reason too short to tell the guest anything, spaces not counting', () => {
    expect(messagesFor('')).toEqual(['venueFoodOwner.orders.cancelReasonTooShort']);
    expect(messagesFor('  ab  ')).toEqual(['venueFoodOwner.orders.cancelReasonTooShort']);
  });

  it('refuses a reason longer than the server keeps', () => {
    expect(messagesFor('x'.repeat(FOOD_CANCEL_REASON_MAX + 1))).toEqual(['venueFoodOwner.orders.cancelReasonTooLong']);
  });

  it('opens blank, which cannot be submitted', () => {
    expect(foodOrderCancelDefaults).toEqual({ reason: '' });
    expect(schema.safeParse(foodOrderCancelDefaults).success).toBe(false);
  });

  it('tells the guest the bounds it holds them to', () => {
    const seen: Array<Record<string, string | number> | undefined> = [];
    makeFoodOrderCancelSchema((key, options) => {
      seen.push(options?.vars);
      return key;
    });
    expect(seen).toEqual([{ min: FOOD_CANCEL_REASON_MIN }, { max: FOOD_CANCEL_REASON_MAX }]);
  });
});
