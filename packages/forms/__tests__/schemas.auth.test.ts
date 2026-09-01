/**
 * The sign-in and password-reset rules, which mWeb and the native app used to
 * hold two copies of. The pair that had actually drifted is pinned first: the
 * app's login schema accepted no `min(1)` and no length ceiling, so an empty box
 * and a 300-character address failed differently on the two surfaces.
 */
import { describe, expect, it } from 'vitest';

import {
  forgotPasswordDefaults,
  loginDefaults,
  makeForgotPasswordSchema,
  makeLoginSchema,
  makeResetPasswordSchema,
  resetPasswordDefaults,
} from '../src/schemas';

/** Hands back the key, so a message failure names the key that was wrong. */
const t = (key: string) => key;

const messagesFor = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('makeLoginSchema', () => {
  const schema = makeLoginSchema(t);

  it('accepts a real sign-in and trims the address', () => {
    const parsed = schema.parse({ email: '  asha@duncit.com ', password: 'correct-horse' });
    expect(parsed.email).toBe('asha@duncit.com');
  });

  it('says the email is REQUIRED first when the box is empty, not that it is invalid', () => {
    const result = schema.safeParse({ email: '   ', password: 'correct-horse' });
    expect(result.success).toBe(false);
    // Zod collects both failures; the form shows the first, and the app's copy
    // of this schema had no `min(1)` at all — so an empty box read "Enter a
    // valid email" there and "Email is required" on mWeb.
    expect(messagesFor(result)[0]).toBe('mweb.auth.validation.emailRequired');
  });

  it('rejects a malformed address', () => {
    const result = schema.safeParse({ email: 'asha@', password: 'correct-horse' });
    expect(messagesFor(result)).toContain('mweb.auth.validation.emailInvalid');
  });

  it('refuses an address over the 254 characters the server stores', () => {
    const long = `${'a'.repeat(250)}@duncit.com`;
    expect(schema.safeParse({ email: long, password: 'correct-horse' }).success).toBe(false);
  });

  it('holds the server password floor at 8', () => {
    expect(schema.safeParse({ email: 'asha@duncit.com', password: '1234567' }).success).toBe(false);
    expect(schema.safeParse({ email: 'asha@duncit.com', password: '12345678' }).success).toBe(true);
  });

  it('starts empty, on the dial code every other phone row in both apps starts on', () => {
    expect(loginDefaults).toEqual({
      email: '',
      phoneExtension: '+91',
      phoneNumber: '',
      password: '',
    });
  });

  /*
    Continue with password reaches the same account on either of the two things
    it is identified by, so the schema is built per channel: the one that is not
    showing must not be able to hold the form shut, and the one that IS showing
    has to be asked for.
  */
  describe('on the PHONE channel', () => {
    const phone = makeLoginSchema(t, 'PHONE');

    it('asks for the number and ignores the address the form is not showing', () => {
      const parsed = phone.safeParse({
        phoneExtension: '+91',
        phoneNumber: '9845012345',
        password: 'correct-horse',
      });
      expect(parsed.success).toBe(true);
    });

    it('refuses a blank number rather than falling through on the email box', () => {
      const result = phone.safeParse({
        phoneExtension: '+91',
        phoneNumber: '',
        password: 'correct-horse',
      });
      expect(result.success).toBe(false);
      expect(messagesFor(result)).toContain('mweb.signup.validation.phoneRequired');
    });

    it('refuses a country code that is not one', () => {
      const result = phone.safeParse({
        phoneExtension: 'x',
        phoneNumber: '9845012345',
        password: 'correct-horse',
      });
      expect(messagesFor(result)).toContain('mweb.signup.validation.codeInvalid');
    });

    it('does not ask for the email the phone form never shows', () => {
      const result = phone.safeParse({
        email: '',
        phoneExtension: '+91',
        phoneNumber: '9845012345',
        password: 'correct-horse',
      });
      expect(result.success).toBe(true);
    });
  });

  it('does not ask for the phone boxes the email form never shows', () => {
    expect(schema.safeParse({ email: 'asha@duncit.com', password: 'correct-horse' }).success).toBe(
      true,
    );
  });
});

describe('makeForgotPasswordSchema', () => {
  const schema = makeForgotPasswordSchema(t);

  it('asks for one valid address', () => {
    expect(schema.parse({ email: ' asha@duncit.com ' }).email).toBe('asha@duncit.com');
    expect(messagesFor(schema.safeParse({ email: '' }))).toContain(
      'mweb.auth.validation.emailRequired',
    );
    expect(messagesFor(schema.safeParse({ email: 'nope' }))).toContain(
      'mweb.auth.validation.emailInvalid',
    );
  });

  it('starts empty', () => {
    expect(forgotPasswordDefaults).toEqual({ email: '' });
  });
});

describe('makeResetPasswordSchema', () => {
  const schema = makeResetPasswordSchema(t);
  const valid = { otp: '482913', new_password: 'correct-horse', confirm_password: 'correct-horse' };

  it('accepts a matching pair behind a 6-digit code', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('refuses a code that is not exactly six digits', () => {
    for (const otp of ['48291', '4829134', '48291a', '']) {
      const result = schema.safeParse({ ...valid, otp });
      expect(result.success, otp).toBe(false);
      expect(messagesFor(result)).toContain('mweb.resetPassword.validation.otpInvalid');
    }
  });

  it('refuses a password over 100 characters', () => {
    const long = 'a'.repeat(101);
    const result = schema.safeParse({ ...valid, new_password: long, confirm_password: long });
    expect(messagesFor(result)).toContain('mweb.auth.validation.passwordTooLong');
  });

  it('reports a mismatch on the confirm box, where the reader last typed', () => {
    const result = schema.safeParse({ ...valid, confirm_password: 'something-else' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirm_password']);
    expect(messagesFor(result)).toContain('mweb.auth.validation.passwordsMismatch');
  });

  it('starts empty', () => {
    expect(resetPasswordDefaults).toEqual({ otp: '', new_password: '', confirm_password: '' });
  });
});
