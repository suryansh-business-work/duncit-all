import { describe, expect, it } from 'vitest';
import { validationRules } from './rules';

const ok = (schema: { isValidSync: (v: unknown) => boolean }, value: unknown) =>
  schema.isValidSync(value);

describe('validationRules', () => {
  it('personName accepts names and rejects junk', () => {
    expect(ok(validationRules.personName('Name'), 'Asha Rao')).toBe(true);
    expect(ok(validationRules.personName('Name'), '123')).toBe(false);
  });

  it('optionalText caps length and defaults empty', () => {
    expect(validationRules.optionalText('T', 5).cast(undefined)).toBe('');
    expect(ok(validationRules.optionalText('T', 5), 'toolong!!')).toBe(false);
  });

  it('requiredText enforces min and max', () => {
    expect(ok(validationRules.requiredText('R', 2, 5), 'ok')).toBe(true);
    expect(ok(validationRules.requiredText('R', 2, 5), 'a')).toBe(false);
    expect(ok(validationRules.requiredText('R', 2, 5), 'toolong')).toBe(false);
  });

  it('email works with default and custom label', () => {
    expect(ok(validationRules.email(), 'a@b.com')).toBe(true);
    expect(ok(validationRules.email('Work email'), 'nope')).toBe(false);
  });

  it('optionalEmail allows blank with default and custom label', () => {
    expect(validationRules.optionalEmail().cast(undefined)).toBe('');
    expect(ok(validationRules.optionalEmail('Alt'), 'x@y.com')).toBe(true);
  });

  it('password enforces minimum length', () => {
    expect(ok(validationRules.password(), 'longenough')).toBe(true);
    expect(ok(validationRules.password('PIN'), 'short')).toBe(false);
  });

  it('phoneNumber and phoneExtension validate digits', () => {
    expect(ok(validationRules.phoneNumber(), '9876543210')).toBe(true);
    expect(ok(validationRules.phoneNumber(), 'abc')).toBe(false);
    expect(ok(validationRules.phoneExtension(), '+91')).toBe(true);
    expect(ok(validationRules.phoneExtension(), 'xx')).toBe(false);
  });

  it('slugKey validates slug format', () => {
    expect(ok(validationRules.slugKey('Key'), 'my-key_1')).toBe(true);
    expect(ok(validationRules.slugKey('Key'), 'Bad Key')).toBe(false);
  });

  it('optionalUrl covers blank, absolute, relative and invalid values', () => {
    expect(validationRules.optionalUrl('U').cast(undefined)).toBe('');
    expect(ok(validationRules.optionalUrl('U'), '')).toBe(true);
    expect(ok(validationRules.optionalUrl('U'), 'https://duncit.com')).toBe(true);
    expect(ok(validationRules.optionalUrl('U'), 'mailto:a@b.com')).toBe(true);
    expect(ok(validationRules.optionalUrl('U'), 'not a url')).toBe(false);
    expect(ok(validationRules.optionalUrl('U', true), '/relative/path')).toBe(true);
    expect(ok(validationRules.optionalUrl('U', true), 'still bad')).toBe(false);
  });
});
