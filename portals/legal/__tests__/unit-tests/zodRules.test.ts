import { describe, expect, it } from 'vitest';
import { zodRules } from '../../src/forms/validation/zodRules';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? '' : (result.error?.issues.map((issue) => issue.message).join(' ') ?? '');

describe('zodRules.email', () => {
  const schema = zodRules.email();

  it('lowercases and trims a valid email', () => {
    expect(schema.parse('  Manager@Duncit.com ')).toBe('manager@duncit.com');
  });

  it('rejects an invalid email with a label-aware message', () => {
    const customised = zodRules.email('Work email');
    expect(messages(customised.safeParse('nope'))).toMatch(/valid work email/i);
  });

  it('requires a value', () => {
    expect(messages(schema.safeParse(''))).toMatch(/required/i);
  });

  it('rejects an over-long email', () => {
    const long = `${'a'.repeat(255)}@x.com`;
    expect(messages(schema.safeParse(long))).toMatch(/too long/i);
  });
});

describe('zodRules.password', () => {
  const schema = zodRules.password();

  it('accepts an 8+ char password', () => {
    expect(schema.parse('secret123')).toBe('secret123');
  });

  it('rejects a short password', () => {
    expect(messages(schema.safeParse('short'))).toMatch(/at least 8/i);
  });

  it('rejects an over-long password', () => {
    expect(messages(schema.safeParse('a'.repeat(129)))).toMatch(/too long/i);
  });

  it('requires a value with a custom label', () => {
    expect(messages(zodRules.password('PIN').safeParse(undefined))).toMatch(/required/i);
  });
});
