import { describe, expect, it } from 'vitest';
import { loginSchema } from '@/forms/login/login.form';
import { loginInitialValues } from '@/forms/login/login.types';

const valid = { ...loginInitialValues, email: 'manager@duncit.com', password: 'secret123' };

describe('loginSchema', () => {
  it('accepts a valid email and password', async () => {
    await expect(loginSchema.validate(valid)).resolves.toMatchObject({ email: 'manager@duncit.com' });
  });

  it('requires both fields', async () => {
    const error = await loginSchema
      .validate({ email: '', password: '' }, { abortEarly: false })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/email/i);
    expect(error.errors.join(' ')).toMatch(/password/i);
  });

  it('rejects an invalid email', async () => {
    const error = await loginSchema.validate({ ...valid, email: 'not-an-email' }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/valid email/i);
  });

  it('rejects a short password', async () => {
    const error = await loginSchema.validate({ ...valid, password: 'short' }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/at least 8/i);
  });

  it('normalises the email to lowercase', async () => {
    const parsed = await loginSchema.validate({ ...valid, email: 'Manager@Duncit.com' });
    expect(parsed.email).toBe('manager@duncit.com');
  });
});
