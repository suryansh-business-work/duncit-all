/**
 * Change-password, delete-account and contact-change.
 *
 * The change-password pair is the one that never reached a translator on either
 * surface, so every assertion below is on a KEY: a literal sentence reappearing
 * here is the regression.
 */
import { describe, expect, it } from 'vitest';

import {
  currentPasswordDefaults,
  deleteAccountDefaults,
  makeContactOtpSchema,
  makeContactValueSchema,
  makeCurrentPasswordSchema,
  makeDeleteAccountSchema,
  makeNewPasswordSchema,
  newPasswordDefaults,
} from '../src/schemas';

const t = (key: string) => key;

const messagesFor = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('makeCurrentPasswordSchema', () => {
  const schema = makeCurrentPasswordSchema(t);

  it('needs the current password before a code is sent', () => {
    expect(schema.safeParse({ current_password: 'correct-horse' }).success).toBe(true);
    expect(messagesFor(schema.safeParse({ current_password: '' }))).toEqual([
      'mweb.changePassword.enterYourCurrentPassword',
    ]);
  });

  it('starts empty', () => {
    expect(currentPasswordDefaults).toEqual({ current_password: '' });
  });
});

describe('makeNewPasswordSchema', () => {
  const schema = makeNewPasswordSchema(t);
  const valid = { otp: '482913', new_password: 'correct-horse', confirm_password: 'correct-horse' };

  it('accepts the emailed code with a matching new password', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('refuses a bad code, a short password and a mismatch — all as keys', () => {
    expect(messagesFor(schema.safeParse({ ...valid, otp: '12' }))).toContain(
      'mweb.resetPassword.validation.otpInvalid',
    );
    expect(
      messagesFor(schema.safeParse({ ...valid, new_password: 'short', confirm_password: 'short' })),
    ).toContain('mweb.auth.validation.passwordMin');
    expect(messagesFor(schema.safeParse({ ...valid, confirm_password: 'other-horse' }))).toContain(
      'mweb.auth.validation.passwordsMismatch',
    );
  });

  it('starts empty', () => {
    expect(newPasswordDefaults).toEqual({ otp: '', new_password: '', confirm_password: '' });
  });
});

describe('makeDeleteAccountSchema', () => {
  const schema = makeDeleteAccountSchema(t);

  it('takes the code and an optional reason — filing a request, not deleting', () => {
    expect(schema.safeParse({ otp: '482913', reason: '' }).success).toBe(true);
    expect(schema.parse({ otp: '482913', reason: '  Moving to a new account  ' }).reason).toBe(
      'Moving to a new account',
    );
  });

  it('refuses a code that is not six digits', () => {
    expect(messagesFor(schema.safeParse({ otp: '4829', reason: '' }))).toContain(
      'mweb.account.deletion.validation.otpPattern',
    );
  });

  it('caps the reason at 1000 characters — a human reads it', () => {
    expect(messagesFor(schema.safeParse({ otp: '482913', reason: 'a'.repeat(1001) }))).toContain(
      'mweb.account.deletion.validation.reasonTooLong',
    );
  });

  it('starts empty', () => {
    expect(deleteAccountDefaults).toEqual({ otp: '', reason: '' });
  });
});

describe('makeContactValueSchema', () => {
  const blank = { email: '', extension: '', number: '' };

  it('asks a phone channel for a code and a number, ignoring the email box', () => {
    const schema = makeContactValueSchema('PHONE', t);
    expect(schema.safeParse({ ...blank, extension: '+91', number: '9820098200' }).success).toBe(
      true,
    );
    expect(messagesFor(schema.safeParse(blank))).toEqual(
      expect.arrayContaining([
        'mweb.contactChange.validation.extensionInvalid',
        'mweb.contactChange.validation.phoneInvalid',
      ]),
    );
  });

  it('treats WhatsApp as a phone channel too', () => {
    const schema = makeContactValueSchema('WHATSAPP', t);
    expect(schema.safeParse({ ...blank, extension: '+91', number: '9820098200' }).success).toBe(
      true,
    );
  });

  it('takes an international number, not only a 10-digit Indian one', () => {
    const schema = makeContactValueSchema('PHONE', t);
    // There is a country-code picker beside the box; a +91-only rule would
    // refuse numbers the picker itself offers.
    expect(schema.safeParse({ ...blank, extension: '+44', number: '7700900123' }).success).toBe(
      true,
    );
  });

  it('asks an email channel for an address, ignoring the phone boxes', () => {
    const schema = makeContactValueSchema('EMAIL', t);
    expect(schema.safeParse({ ...blank, email: 'asha@duncit.com' }).success).toBe(true);
    expect(messagesFor(schema.safeParse(blank))).toContain(
      'mweb.contactChange.validation.emailInvalid',
    );
  });

  it('refuses an address past the 254 characters the server stores', () => {
    const schema = makeContactValueSchema('EMAIL', t);
    const long = `${'a'.repeat(250)}@duncit.com`;
    expect(messagesFor(schema.safeParse({ ...blank, email: long }))).toContain(
      'mweb.contactChange.validation.emailTooLong',
    );
  });

  it('never lets "Send code" through with nothing typed', () => {
    // The whole reason this is built per channel rather than as one schema with
    // every field optional.
    for (const channel of ['PHONE', 'WHATSAPP', 'EMAIL'] as const) {
      expect(makeContactValueSchema(channel, t).safeParse(blank).success, channel).toBe(false);
    }
  });
});

describe('makeContactOtpSchema', () => {
  it('takes six digits and nothing else', () => {
    const schema = makeContactOtpSchema(t);
    expect(schema.parse({ otp: ' 482913 ' }).otp).toBe('482913');
    expect(messagesFor(schema.safeParse({ otp: '4829' }))).toContain(
      'mweb.contactChange.validation.otpInvalid',
    );
  });
});
