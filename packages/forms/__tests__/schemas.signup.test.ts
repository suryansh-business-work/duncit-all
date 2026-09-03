import { describe, expect, it } from 'vitest';
import { latestEligibleBirthYear } from '@duncit/datetime';

import { makeSignupSchema, signupDefaults } from '../src/schemas/signup';

/** Messages come back as their keys, so a rule is asserted by WHICH one fired. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const schema = makeSignupSchema(t, 18);
const ELIGIBLE_YEAR = String(latestEligibleBirthYear(18));

const valid = {
  name: 'Riya Sharma',
  dobYear: ELIGIBLE_YEAR,
  email: 'riya@duncit.com',
  phoneExtension: '+91',
  phoneNumber: '9845012345',
  whatsappIsMobile: true,
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
  referralCode: '',
  acceptedPolicyIds: [],
};

const errorsOf = (input: Record<string, unknown>) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('the one signup contract', () => {
  it('accepts a complete, valid signup', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('exposes empty defaults with the market dial code', () => {
    expect(signupDefaults.name).toBe('');
    expect(signupDefaults.dobYear).toBe('');
    expect(signupDefaults.phoneExtension).toBe('+91');
    expect(signupDefaults.acceptedPolicyIds).toEqual([]);
  });
});

describe('the name rule the two surfaces used to disagree on', () => {
  it('says REQUIRED for an empty box, not "too short"', () => {
    // mWeb said required, the app said "at least 2 characters". A blank box has
    // one honest message, and this is it.
    expect(errorsOf({ ...valid, name: '' })).toContain('mweb.signup.validation.nameRequired');
  });

  it('says too short for one letter', () => {
    expect(errorsOf({ ...valid, name: 'A' })).toContain('mweb.signup.validation.nameMin');
  });

  it('accepts a long Indian full name, which mWeb used to refuse at 60', () => {
    const long = 'Venkata Naga Sai Lakshmi Narasimha Rao Chandrasekhar Varaprasad';
    expect(long.length).toBeGreaterThan(60);
    expect(schema.safeParse({ ...valid, name: long }).success).toBe(true);
  });

  it('still refuses characters a name cannot hold', () => {
    expect(errorsOf({ ...valid, name: 'Riya 99' })).toContain(
      'mweb.signup.validation.namePattern',
    );
  });
});

describe('the birth year', () => {
  it('requires one', () => {
    expect(errorsOf({ ...valid, dobYear: '' })).toContain(
      'mweb.signup.validation.dobYearRequired',
    );
  });

  it('wants four digits, from @duncit/regex', () => {
    expect(errorsOf({ ...valid, dobYear: '90' })).toContain(
      'mweb.signup.validation.dobYearInvalid',
    );
  });

  it('refuses a year too recent to be old enough, and names the age', () => {
    const tooYoung = String(Number(ELIGIBLE_YEAR) + 1);
    expect(errorsOf({ ...valid, dobYear: tooYoung })).toContain(
      'mweb.signup.validation.dobMinAge:{"years":18}',
    );
  });

  it('takes the minimum age it is given', () => {
    const strict = makeSignupSchema(t, 21);
    expect(strict.safeParse({ ...valid, dobYear: ELIGIBLE_YEAR }).success).toBe(false);
  });
});

describe('the contact details', () => {
  it('says REQUIRED for a blank email, not "invalid"', () => {
    expect(errorsOf({ ...valid, email: '' })).toContain('mweb.auth.validation.emailRequired');
  });

  it('says invalid for a malformed one', () => {
    expect(errorsOf({ ...valid, email: 'nope' })).toContain('mweb.auth.validation.emailInvalid');
  });

  it('checks both halves of the number for shape', () => {
    expect(errorsOf({ ...valid, phoneNumber: '' })).toContain(
      'mweb.signup.validation.phoneRequired',
    );
    expect(errorsOf({ ...valid, phoneNumber: '98-45' })).toContain(
      'mweb.signup.validation.phoneInvalid',
    );
    expect(errorsOf({ ...valid, phoneExtension: '' })).toContain(
      'mweb.signup.validation.codeRequired',
    );
    expect(errorsOf({ ...valid, phoneExtension: 'IN' })).toContain(
      'mweb.signup.validation.codeInvalid',
    );
  });
});

describe('the password pair the two surfaces used to disagree on', () => {
  it('holds the length rule on the password alone', () => {
    expect(errorsOf({ ...valid, password: 'short', confirmPassword: 'short' })).toContain(
      'mweb.auth.validation.passwordMin',
    );
  });

  it('caps a password that is too long to be one', () => {
    const huge = 'a'.repeat(129);
    expect(errorsOf({ ...valid, password: huge, confirmPassword: huge })).toContain(
      'mweb.auth.validation.passwordTooLong',
    );
  });

  it('asks the confirm box only whether it was filled in', () => {
    // The app demanded 8 characters here, which reported "Min 8 characters"
    // under a box whose real problem is that it does not match.
    expect(errorsOf({ ...valid, confirmPassword: '' })).toContain(
      'mweb.signup.validation.confirmRequired',
    );
  });

  it('reports a mismatch against the confirm box', () => {
    const result = schema.safeParse({ ...valid, confirmPassword: 'Different123' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues.find(
      (i) => i.message === 'mweb.auth.validation.passwordsMismatch',
    );
    expect(issue?.path).toEqual(['confirmPassword']);
  });
});

describe('the referral code', () => {
  it('is optional', () => {
    expect(schema.safeParse({ ...valid, referralCode: '' }).success).toBe(true);
  });

  it('accepts a real code in either case', () => {
    expect(schema.safeParse({ ...valid, referralCode: 'DUN-A1B2C3' }).success).toBe(true);
    expect(schema.safeParse({ ...valid, referralCode: 'dun-a1b2c3' }).success).toBe(true);
  });

  it('flags a typo as a shape problem', () => {
    expect(errorsOf({ ...valid, referralCode: 'NOPE' })).toContain(
      'mweb.referral.validation.codePattern',
    );
  });
});

describe('the policies', () => {
  it('accepts anything when nothing gates signup', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('refuses until every required policy is ticked, and says so on the field', () => {
    const gated = makeSignupSchema(t, 18, ['terms', 'privacy']);
    const result = gated.safeParse({ ...valid, acceptedPolicyIds: ['terms'] });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues.find((i) => i.message === 'policyAcceptance.required');
    expect(issue?.path).toEqual(['acceptedPolicyIds']);
  });

  it('passes once all of them are', () => {
    const gated = makeSignupSchema(t, 18, ['terms', 'privacy']);
    expect(gated.safeParse({ ...valid, acceptedPolicyIds: ['terms', 'privacy'] }).success).toBe(
      true,
    );
  });
});

describe('the default minimum age', () => {
  it('falls back to the shared constant when none is given', () => {
    const relaxed = makeSignupSchema(t);
    expect(relaxed.safeParse({ ...valid, dobYear: '1990' }).success).toBe(true);
  });
});
