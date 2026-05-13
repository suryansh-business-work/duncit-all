import { describe, expect, it } from 'vitest';
import { loginSchema, toLoginPayload } from './auth.form';

describe('admin login form schema', () => {
  it('rejects empty values with required errors', async () => {
    const error = await loginSchema.validate({ email: '', password: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/email/i);
    expect(error.errors.join(' ')).toMatch(/password/i);
  });

  it('rejects invalid email format', async () => {
    const error = await loginSchema
      .validate({ email: 'not-an-email', password: 'longenough' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/email/i);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const error = await loginSchema
      .validate({ email: 'a@b.co', password: 'short' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/8 characters/i);
  });

  it('accepts valid credentials and normalises through toLoginPayload', () => {
    const payload = toLoginPayload({ email: ' Admin@Example.COM ', password: 'longenough' });
    expect(payload.email).toBe('admin@example.com');
    expect(payload.password).toBe('longenough');
  });
});
