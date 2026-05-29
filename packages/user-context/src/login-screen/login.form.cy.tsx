import { describe, expect, it } from 'vitest';
import { loginSchema, DEV_ADMIN_CREDENTIALS } from './login.form';

describe('loginSchema', () => {
  it('rejects an empty email', async () => {
    const err = await loginSchema
      .validate({ email: '', password: 'secret' }, { abortEarly: false })
      .catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/e-mail/i);
  });

  it('rejects an invalid email', async () => {
    const err = await loginSchema
      .validate({ email: 'not-an-email', password: 'secret' }, { abortEarly: false })
      .catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/valid e-mail/i);
  });

  it('rejects a missing password', async () => {
    const err = await loginSchema
      .validate({ email: 'a@duncit.com', password: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(err.errors.join(' ')).toMatch(/password/i);
  });

  it('accepts a valid email + password', async () => {
    await loginSchema.validate({ email: 'a@duncit.com', password: 'secret' });
  });

  it('ships dev admin credentials for the temp helper', () => {
    expect(DEV_ADMIN_CREDENTIALS.email).toMatch(/@/);
    expect(DEV_ADMIN_CREDENTIALS.password.length).toBeGreaterThan(0);
  });
});
