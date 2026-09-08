import { describe, expect, it } from 'vitest';
import { latestEligibleDob, toIsoDay } from '@duncit/datetime';
import { registerSchema, registerDefaults } from './register.types';

/** The newest birthday that still clears the default minimum age. */
const ELIGIBLE_DOB = toIsoDay(latestEligibleDob());

const valid = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phoneExtension: '+91',
  phoneNumber: '9845012345',
  password: 'longenough',
  confirmPassword: 'longenough',
  dob: ELIGIBLE_DOB,
  referralCode: '',
  acceptedPolicyIds: [],
};

const firstError = (result: ReturnType<typeof registerSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('registerSchema', () => {
  it('exposes empty defaults', () => {
    expect(registerDefaults.dob).toBe('');
    expect(registerDefaults.name).toBe('');
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

  it('rejects a phone number that is not digits', () => {
    const result = registerSchema.safeParse({ ...valid, phoneNumber: '98-45-01' });
    expect(firstError(result)).toMatch(/digits only/i);
  });

  it('rejects a dial code that is not one', () => {
    expect(firstError(registerSchema.safeParse({ ...valid, phoneExtension: 'IN' }))).toMatch(
      /code like/i,
    );
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    });
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

  it('rejects an empty date of birth', () => {
    expect(firstError(registerSchema.safeParse({ ...valid, dob: '' }))).toMatch(
      /date of birth is required/i,
    );
  });

  it('rejects anything that is not a real YYYY-MM-DD day', () => {
    expect(firstError(registerSchema.safeParse({ ...valid, dob: '23/04/1998' }))).toMatch(
      /valid date of birth/i,
    );
    expect(firstError(registerSchema.safeParse({ ...valid, dob: '1998-02-30' }))).toMatch(
      /valid date of birth/i,
    );
  });

  it('rejects a date of birth too recent to be old enough', () => {
    const tooYoung = toIsoDay(new Date(latestEligibleDob().getTime() + 86_400_000));
    expect(firstError(registerSchema.safeParse({ ...valid, dob: tooYoung }))).toMatch(
      /at least/i,
    );
  });

  it('accepts a blank referral code, and rejects a malformed one', () => {
    expect(registerSchema.safeParse({ ...valid, referralCode: '' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, referralCode: 'DUN-A1B2C3' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, referralCode: 'nope' }).success).toBe(false);
  });
});
