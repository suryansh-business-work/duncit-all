import { describe, expect, it } from 'vitest';
import {
  EmailValidationError,
  assertValidEmailOptions,
  bareAddress,
  isEmailAddress,
  toAddressList,
} from '../src/index';
import type { EmailSendOptions } from '../src/index';

const valid: EmailSendOptions = {
  category: 'transactional',
  to: 'user@example.com',
  subject: 'Booking Confirmed',
  html: '<p>hi</p>',
};

describe('address handling', () => {
  it('reads the address out of a display-name form', () => {
    expect(bareAddress('Duncit <noreply@duncit.com>')).toBe('noreply@duncit.com');
    expect(bareAddress('  plain@duncit.com  ')).toBe('plain@duncit.com');
  });

  it('accepts both forms and rejects the near-misses', () => {
    expect(isEmailAddress('Duncit <noreply@duncit.com>')).toBe(true);
    expect(isEmailAddress('a@b.co')).toBe(true);
    expect(isEmailAddress('no-at-sign')).toBe(false);
    expect(isEmailAddress('a@b')).toBe(false);
    expect(isEmailAddress('a b@c.com')).toBe(false);
    expect(isEmailAddress(42)).toBe(false);
  });

  it('de-duplicates case-insensitively — the same person billed twice is the bug', () => {
    expect(toAddressList(['A@x.com', 'a@x.com', 'Duncit <A@X.com>', 'b@x.com'])).toEqual([
      'A@x.com',
      'b@x.com',
    ]);
  });

  it('drops blanks and non-strings, and handles a single address', () => {
    expect(toAddressList('one@x.com')).toEqual(['one@x.com']);
    expect(toAddressList(['  ', null as never, 'ok@x.com'])).toEqual(['ok@x.com']);
    expect(toAddressList(undefined)).toEqual([]);
  });
});

describe('assertValidEmailOptions', () => {
  it('accepts a well-formed message', () => {
    expect(() => assertValidEmailOptions(valid)).not.toThrow();
  });

  it('rejects a missing options object', () => {
    expect(() => assertValidEmailOptions(undefined as never)).toThrow(EmailValidationError);
    expect(() => assertValidEmailOptions('nope' as never)).toThrow(/options are required/);
  });

  it('requires a known category — a typo must not send as something else', () => {
    expect(() => assertValidEmailOptions({ ...valid, category: 'promo' as never })).toThrow(
      /category must be one of/,
    );
  });

  it('requires at least one recipient', () => {
    expect(() => assertValidEmailOptions({ ...valid, to: [] })).toThrow(/to is required/);
  });

  it.each([
    ['to', { to: 'not-an-email' }],
    ['cc', { cc: ['bad'] }],
    ['bcc', { bcc: ['bad'] }],
    ['from', { from: 'bad' }],
    ['replyTo', { replyTo: 'bad' }],
  ])('names %s when that address is malformed', (field, patch) => {
    try {
      assertValidEmailOptions({ ...valid, ...patch } as EmailSendOptions);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as EmailValidationError).field).toBe(field);
      expect((error as EmailValidationError).retryable).toBe(false);
    }
  });

  it('requires a subject', () => {
    expect(() => assertValidEmailOptions({ ...valid, subject: '   ' })).toThrow(
      /subject is required/,
    );
    expect(() => assertValidEmailOptions({ ...valid, subject: 42 as never })).toThrow(
      /subject is required/,
    );
  });

  it('refuses a subject with nothing under it', () => {
    const { html, ...bodyless } = valid;
    expect(() => assertValidEmailOptions(bodyless as EmailSendOptions)).toThrow(
      /one of template, html or text is required/,
    );
  });

  it.each([
    ['template', { template: 'welcome' }],
    ['text', { text: 'hello' }],
  ])('accepts %s as the body', (_name, patch) => {
    const { html, ...rest } = valid;
    expect(() => assertValidEmailOptions({ ...rest, ...patch } as EmailSendOptions)).not.toThrow();
  });

  it('rejects an attachment with no filename or no content', () => {
    expect(() =>
      assertValidEmailOptions({
        ...valid,
        attachments: [{ filename: '', content: 'x' }],
      }),
    ).toThrow(/attachments\[0\].filename is required/);
    expect(() =>
      assertValidEmailOptions({
        ...valid,
        attachments: [
          { filename: 'a.pdf', content: 'ok' },
          { filename: 'b.pdf', content: '' },
        ],
      }),
    ).toThrow(/attachments\[1\].content is empty/);
    expect(() =>
      assertValidEmailOptions({
        ...valid,
        attachments: [null as never],
      }),
    ).toThrow(/attachments\[0\].filename is required/);
  });
});
