import { describe, expect, it } from 'vitest';
import { registerSchema, registerDefaults } from './register.types';

const today = new Date();
const validDob = `${today.getFullYear() - 18}-01-01`;

const valid = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'longenough',
  confirmPassword: 'longenough',
  dob: validDob,
};

const firstError = (result: ReturnType<typeof registerSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('registerSchema', () => {
  it('exposes empty defaults', () => {
    expect(registerDefaults.dob).toBe('');
  });

  it('accepts a fully valid register payload', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects names with special chars', () => {
    const result = registerSchema.safeParse({ ...valid, name: 'Jane@!' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/letters/i);
  });

  it('rejects an empty name', () => {
    const result = registerSchema.safeParse({ ...valid, name: '' });
    expect(firstError(result)).toMatch(/name is required/i);
  });

  it('rejects an invalid email', () => {
    expect(firstError(registerSchema.safeParse({ ...valid, email: 'bad' }))).toMatch(/valid email/i);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' });
    expect(firstError(result)).toMatch(/8 characters/i);
  });

  it('rejects a missing confirm password', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: '' });
    expect(firstError(result)).toMatch(/confirm/i);
  });

  it('rejects a mismatched confirm password', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'different1' });
    expect(firstError(result)).toMatch(/match/i);
  });

  it('rejects an empty birth year', () => {
    expect(firstError(registerSchema.safeParse({ ...valid, dob: '' }))).toMatch(/birth year is required/i);
  });

  it('rejects a future birth year', () => {
    const future = `${today.getFullYear() + 1}-01-01`;
    expect(firstError(registerSchema.safeParse({ ...valid, dob: future }))).toMatch(/between/i);
  });

  it('rejects a birth year outside the allowed bounds', () => {
    const tooYoung = `${today.getFullYear() - 10}-01-01`;
    expect(firstError(registerSchema.safeParse({ ...valid, dob: tooYoung }))).toMatch(/between/i);
  });
});
