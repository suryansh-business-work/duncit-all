import { describe, expect, it } from 'vitest';
import { validationRules } from '../../src/forms/validation/rules';

describe('validationRules.email', () => {
  const schema = validationRules.email();

  it('lowercases and trims a valid email', async () => {
    expect(await schema.validate('  Manager@Duncit.com ')).toBe('manager@duncit.com');
  });

  it('rejects an invalid email with a label-aware message', async () => {
    const customised = validationRules.email('Work email');
    const err = await customised.validate('nope').catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/valid work email/i);
  });

  it('requires a value', async () => {
    const err = await schema.validate('').catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/required/i);
  });

  it('rejects an over-long email', async () => {
    const long = `${'a'.repeat(255)}@x.com`;
    const err = await schema.validate(long).catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/too long/i);
  });
});

describe('validationRules.password', () => {
  const schema = validationRules.password();

  it('accepts an 8+ char password', async () => {
    expect(await schema.validate('secret123')).toBe('secret123');
  });

  it('rejects a short password', async () => {
    const err = await schema.validate('short').catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/at least 8/i);
  });

  it('rejects an over-long password', async () => {
    const err = await schema.validate('a'.repeat(129)).catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/too long/i);
  });

  it('requires a value with a custom label', async () => {
    const err = await validationRules.password('PIN').validate(undefined).catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/pin is required/i);
  });
});
