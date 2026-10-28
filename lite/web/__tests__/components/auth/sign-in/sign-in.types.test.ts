import { createTranslator } from '@duncit/i18n';
import { describe, expect, it } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { makeCodeSchema, makeContactSchema } from '../../../../components/auth/sign-in';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

/** The first message the form would show for `value`, or null when it passes. */
const firstProblem = (result: { success: boolean; error?: { issues: { message: string }[] } }) => (result.success ? null : (result.error?.issues[0]?.message ?? 'invalid'));

describe('makeContactSchema — email', () => {
  const schema = makeContactSchema(t, 'EMAIL');

  it('accepts an address, trimmed and lower-cased as the API stores it', () => {
    expect(schema.parse({ value: '  Asha@Example.COM ' })).toEqual({ value: 'asha@example.com' });
  });

  it('asks for an address when the box is blank', () => {
    expect(firstProblem(schema.safeParse({ value: '   ' }))).toBe('This is required');
  });

  it.each(['asha', 'asha@example', 'asha @example.com', '@example.com'])('refuses %s as not an email', (value) => {
    expect(firstProblem(schema.safeParse({ value }))).toBe('Enter a valid email address');
  });

  it('refuses an address longer than 254 characters', () => {
    const value = `${'a'.repeat(250)}@example.com`;
    expect(firstProblem(schema.safeParse({ value }))).toBe('Keep this to 254 characters or fewer');
  });
});

describe('makeContactSchema — phone', () => {
  const schema = makeContactSchema(t, 'PHONE');

  it.each(['+91 98765 43210', '98765 43210', '(022) 1234-5678', '+14155550123'])('accepts %s', (value) => {
    expect(schema.safeParse({ value }).success).toBe(true);
  });

  it('keeps the number as typed (the API normalises it)', () => {
    expect(schema.parse({ value: ' +91 98765 43210 ' })).toEqual({ value: '+91 98765 43210' });
  });

  it.each([
    ['too few digits', '1234567'],
    ['letters', 'call me'],
    ['a dot separator', '98765.43210'],
    ['a plus in the middle', '91+9876543210'],
    ['more than fifteen digits', '+1234567890123456'],
    ['nothing', ''],
  ])('refuses %s', (_case, value) => {
    expect(firstProblem(schema.safeParse({ value }))).toBe('Enter a valid phone number');
  });
});

describe('makeCodeSchema', () => {
  const schema = makeCodeSchema(t);

  it('accepts a six-digit code, trimmed, with no name', () => {
    expect(schema.parse({ code: ' 123456 ', name: '' })).toEqual({ code: '123456', name: '' });
  });

  it('keeps the name a new account gives, trimmed', () => {
    expect(schema.parse({ code: '000000', name: '  Asha Rao ' })).toEqual({ code: '000000', name: 'Asha Rao' });
  });

  it.each(['12345', '1234567', 'abcdef', '12 345'])('refuses %s as a code', (code) => {
    expect(firstProblem(schema.safeParse({ code, name: '' }))).toBe('Enter the 6-digit code');
  });

  it('refuses a name over 80 characters', () => {
    expect(firstProblem(schema.safeParse({ code: '123456', name: 'n'.repeat(81) }))).toBe('Keep this to 80 characters or fewer');
  });
});
