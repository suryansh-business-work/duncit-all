/**
 * The Pod Shop "Return items" form, shared by mWeb and the app. The rules worth
 * pinning are the ones the server would otherwise refuse with a raw error:
 * nothing picked, more units than can go back, no reason, over-long comments.
 */
import { describe, expect, it } from 'vitest';

import { makePodShopReturnSchema } from '../src/schemas/pod-shop-return';

const t = (key: string) => `[${key}]`;
const schema = makePodShopReturnSchema(t);

const line = (qty: number, max = 2) => ({
  product_id: 'p1',
  variant_id: '',
  name: 'Shuttlecock',
  variant_label: '',
  max,
  qty,
});

const messagesOf = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makePodShopReturnSchema', () => {
  it('accepts a picked line within what can go back, with a reason', () => {
    expect(messagesOf({ lines: [line(2), line(0)], reason: 'damaged', comments: '' })).toEqual([]);
  });

  it('refuses a form where nothing is picked', () => {
    expect(messagesOf({ lines: [line(0)], reason: 'damaged', comments: '' })).toEqual([
      '[mweb.podShopReturns.errorPickItem]',
    ]);
  });

  it('refuses more units than the server says can still go back', () => {
    expect(messagesOf({ lines: [line(3, 2)], reason: 'damaged', comments: '' })).toEqual([
      '[mweb.podShopReturns.errorQtyTooHigh]',
    ]);
  });

  it('needs a reason', () => {
    expect(messagesOf({ lines: [line(1)], reason: '', comments: '' })).toEqual([
      '[mweb.podShopReturns.errorPickReason]',
    ]);
  });

  it('caps comments at 2000 characters', () => {
    expect(messagesOf({ lines: [line(1)], reason: 'other', comments: 'x'.repeat(2000) })).toEqual([]);
    expect(messagesOf({ lines: [line(1)], reason: 'other', comments: 'x'.repeat(2001) })).toEqual([
      '[mweb.podShopReturns.errorCommentsTooLong]',
    ]);
  });

  it('refuses a negative quantity', () => {
    expect(messagesOf({ lines: [line(-1), line(1)], reason: 'other', comments: '' }).length).toBeGreaterThan(0);
  });
});
