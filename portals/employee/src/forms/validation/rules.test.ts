import { describe, expect, it } from 'vitest';

import { validationRules } from './rules';

describe('validationRules.email', () => {
  const email = validationRules.email();

  it('accepts and normalises a valid email', async () => {
    await expect(email.validate(' User@Example.COM ')).resolves.toBe('user@example.com');
  });

  it('rejects an invalid or missing email', async () => {
    await expect(email.validate('nope')).rejects.toThrow(/valid email/i);
    await expect(email.validate('')).rejects.toThrow(/required/i);
  });
});

describe('validationRules.password', () => {
  const password = validationRules.password();

  it('accepts an 8+ char password', async () => {
    await expect(password.validate('supersecret')).resolves.toBe('supersecret');
  });

  it('rejects a short or missing password', async () => {
    await expect(password.validate('short')).rejects.toThrow(/at least 8/i);
    await expect(password.validate(undefined)).rejects.toThrow(/required/i);
  });
});
