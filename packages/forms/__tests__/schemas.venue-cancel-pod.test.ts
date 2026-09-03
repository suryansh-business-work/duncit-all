/**
 * The reason a venue owner gives before a pod is cancelled — mWeb and the
 * native app each held this rule beside their own dialog. Every assertion is
 * on a KEY: a literal sentence reappearing here is the regression.
 */
import { describe, expect, it } from 'vitest';

import { makeVenueCancelPodSchema, venueCancelPodDefaults } from '../src/schemas';

const t = (key: string) => key;
const schema = makeVenueCancelPodSchema(t);

const messagesFor = (reason: string) => {
  const result = schema.safeParse({ reason });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeVenueCancelPodSchema', () => {
  it('accepts a reason the cancellation email can carry, trimmed', () => {
    expect(schema.parse({ reason: '  Venue flooded overnight  ' })).toEqual({
      reason: 'Venue flooded overnight',
    });
  });

  it('refuses a blank or a too-short reason with the shared key', () => {
    for (const reason of ['', '    ', 'Rain', ' Rain  ']) {
      expect(messagesFor(reason)).toEqual(['mweb.venuePods.reasonRequired']);
    }
  });

  it('starts empty', () => {
    expect(venueCancelPodDefaults).toEqual({ reason: '' });
  });
});
