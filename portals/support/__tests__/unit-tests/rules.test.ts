import { describe, expect, it } from 'vitest';
import { validationRules } from '../../src/forms/validation/rules';
import type { ZodTypeAny } from 'zod';

const messages = (schema: ZodTypeAny, input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('validationRules.email', () => {
  const schema = validationRules.email();

  it('lowercases and trims a valid email', () => {
    expect(schema.parse('  Manager@Duncit.com ')).toBe('manager@duncit.com');
  });

  it('rejects an invalid email with a label-aware message', () => {
    const customised = validationRules.email('Work email');
    expect(messages(customised, 'nope')).toMatch(/valid work email/i);
  });

  it('requires a value', () => {
    expect(messages(schema, '')).toMatch(/required/i);
  });

  it('rejects an over-long email', () => {
    const long = `${'a'.repeat(255)}@x.com`;
    expect(messages(schema, long)).toMatch(/too long/i);
  });
});

describe('validationRules.password', () => {
  const schema = validationRules.password();

  it('accepts an 8+ char password', () => {
    expect(schema.parse('secret123')).toBe('secret123');
  });

  it('rejects a short password', () => {
    expect(messages(schema, 'short')).toMatch(/at least 8/i);
  });

  it('rejects an over-long password', () => {
    expect(messages(schema, 'a'.repeat(129))).toMatch(/too long/i);
  });

  it('requires a value with a custom label', () => {
    expect(messages(validationRules.password('PIN'), undefined)).toMatch(/pin is required/i);
  });
});
