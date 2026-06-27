import { describe, expect, it } from 'vitest';

import { zodRules } from './zodRules';

describe('zodRules.email', () => {
  const email = zodRules.email();

  it('accepts and normalises a valid email', () => {
    expect(email.parse(' User@Example.COM ')).toBe('user@example.com');
  });

  it('rejects an invalid or missing email', () => {
    const invalid = email.safeParse('nope');
    expect(invalid.success).toBe(false);
    expect(invalid.success ? '' : invalid.error.issues.map((i) => i.message).join(' ')).toMatch(/valid email/i);
    const missing = email.safeParse('');
    expect(missing.success).toBe(false);
    expect(missing.success ? '' : missing.error.issues.map((i) => i.message).join(' ')).toMatch(/required/i);
  });
});

describe('zodRules.password', () => {
  const password = zodRules.password();

  it('accepts an 8+ char password', () => {
    expect(password.parse('supersecret')).toBe('supersecret');
  });

  it('rejects a short or missing password', () => {
    const short = password.safeParse('short');
    expect(short.success).toBe(false);
    expect(short.success ? '' : short.error.issues.map((i) => i.message).join(' ')).toMatch(/at least 8/i);
    const missing = password.safeParse(undefined);
    expect(missing.success).toBe(false);
  });
});
