/**
 * "I cannot or will not share my location": the one box an administrator reads
 * before deciding whether another way of verifying is acceptable. The limits
 * are the server's own, so the form refuses exactly what the server would.
 */
import { describe, expect, it } from 'vitest';

import {
  SECURITY_EXCEPTION_REASON_MAX,
  SECURITY_EXCEPTION_REASON_MIN,
  makeSecurityExceptionSchema,
  securityExceptionDefaults,
} from '../src/schemas';

/** Hands back the key and its variables, so a failure names exactly what was wrong. */
const t = (key: string, options?: { vars?: Record<string, string> }) =>
  options?.vars ? `${key}|${JSON.stringify(options.vars)}` : key;

const messagesFor = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('makeSecurityExceptionSchema', () => {
  const schema = makeSecurityExceptionSchema(t);

  it('starts empty: the person writes the reason themselves', () => {
    expect(securityExceptionDefaults).toEqual({ reason: '' });
  });

  it('accepts a reason of the minimum length, and one of the maximum', () => {
    expect(schema.safeParse({ reason: 'x'.repeat(SECURITY_EXCEPTION_REASON_MIN) }).success).toBe(true);
    expect(schema.safeParse({ reason: 'x'.repeat(SECURITY_EXCEPTION_REASON_MAX) }).success).toBe(true);
  });

  it('trims the reason before measuring and before sending it', () => {
    expect(schema.parse({ reason: '   The browser has no location service   ' })).toEqual({
      reason: 'The browser has no location service',
    });
    // Ten spaces around three letters is three letters.
    expect(schema.safeParse({ reason: `     abc     ` }).success).toBe(false);
  });

  it('refuses a reason too short to act on, naming the minimum', () => {
    const result = schema.safeParse({ reason: 'x'.repeat(SECURITY_EXCEPTION_REASON_MIN - 1) });
    expect(messagesFor(result)).toEqual([
      `shell.securityVerification.alternative.reasonTooShort|{"min":"${SECURITY_EXCEPTION_REASON_MIN}"}`,
    ]);
  });

  it('refuses an empty box', () => {
    expect(schema.safeParse(securityExceptionDefaults).success).toBe(false);
  });

  it('refuses a reason too long to store, naming the maximum', () => {
    const result = schema.safeParse({ reason: 'x'.repeat(SECURITY_EXCEPTION_REASON_MAX + 1) });
    expect(messagesFor(result)).toEqual([
      `shell.securityVerification.alternative.reasonTooLong|{"max":"${SECURITY_EXCEPTION_REASON_MAX}"}`,
    ]);
  });

  it('keeps the same limits as the server', () => {
    // portalSecurity.constants: EXCEPTION_REASON_MIN / EXCEPTION_REASON_MAX.
    expect([SECURITY_EXCEPTION_REASON_MIN, SECURITY_EXCEPTION_REASON_MAX]).toEqual([10, 500]);
  });
});
