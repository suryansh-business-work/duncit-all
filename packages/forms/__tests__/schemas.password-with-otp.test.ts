/**
 * The password rules the recovery flow proves in two places.
 *
 * `makePasswordWithOtpSchema` is the single-screen form — code and password
 * together; `makePasswordPairSchema` is the last step of the flow that proved
 * its code earlier, so it has the same ceiling, floor and match rule and no
 * `otp`. They are asserted side by side because that identity is the whole
 * reason the pair was split out of the first one.
 */
import { describe, expect, it } from 'vitest';

import {
  makePasswordPairSchema,
  makePasswordWithOtpSchema,
  passwordPairDefaults,
  passwordWithOtpDefaults,
} from '../src/schemas';

/** Hands back the key, so a message failure names the key that was wrong. */
const t = (key: string) => key;

const messagesFor = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

const GOOD = 'correct-horse-9';

describe('makePasswordWithOtpSchema', () => {
  const schema = makePasswordWithOtpSchema(t);

  it('accepts a six-digit code beside a matching pair', () => {
    const result = schema.safeParse({ otp: '123456', new_password: GOOD, confirm_password: GOOD });

    expect(result.success).toBe(true);
  });

  it('rejects a code that is not six digits', () => {
    expect(messagesFor(schema.safeParse({ otp: '12345', new_password: GOOD, confirm_password: GOOD }))).toContain(
      'mweb.resetPassword.validation.otpInvalid',
    );
    expect(messagesFor(schema.safeParse({ otp: '12345a', new_password: GOOD, confirm_password: GOOD }))).toContain(
      'mweb.resetPassword.validation.otpInvalid',
    );
  });

  it('reports a mismatch under the confirm box, not the password above it', () => {
    const result = schema.safeParse({ otp: '123456', new_password: GOOD, confirm_password: 'something-else' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirm_password']);
    expect(result.error?.issues[0]?.message).toBe('mweb.auth.validation.passwordsMismatch');
  });

  it('starts empty, which its own rules reject', () => {
    expect(schema.safeParse(passwordWithOtpDefaults).success).toBe(false);
  });
});

describe('makePasswordPairSchema', () => {
  const schema = makePasswordPairSchema(t);

  it('accepts a matching pair with no code beside it', () => {
    expect(schema.safeParse({ new_password: GOOD, confirm_password: GOOD }).success).toBe(true);
  });

  it('holds the same floor and ceiling as the code form', () => {
    expect(messagesFor(schema.safeParse({ new_password: 'short', confirm_password: 'short' }))).toContain(
      'mweb.auth.validation.passwordMin',
    );
    const tooLong = 'a'.repeat(101);
    expect(messagesFor(schema.safeParse({ new_password: tooLong, confirm_password: tooLong }))).toContain(
      'mweb.auth.validation.passwordTooLong',
    );
  });

  it('reports a mismatch under the confirm box', () => {
    const result = schema.safeParse({ new_password: GOOD, confirm_password: 'something-else' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirm_password']);
  });

  it('starts empty, which its own rules reject', () => {
    expect(schema.safeParse(passwordPairDefaults).success).toBe(false);
  });
});
