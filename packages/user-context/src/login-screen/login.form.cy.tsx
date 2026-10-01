import { describe, expect, it } from 'vitest';
import { buildLoginSchema } from './login.form';
import { sessionT } from '../i18n';

const loginSchema = buildLoginSchema(sessionT);

const messages = (values: { email: string; password: string }) => {
  const parsed = loginSchema.safeParse(values);
  return parsed.success ? '' : parsed.error.issues.map((issue) => issue.message).join(' ');
};

describe('loginSchema', () => {
  it('rejects an empty email', () => {
    expect(messages({ email: '', password: 'secret' })).toMatch(/e-mail/i);
  });

  it('rejects an invalid email', () => {
    expect(messages({ email: 'not-an-email', password: 'secret' })).toMatch(/valid e-mail/i);
  });

  it('rejects a missing password', () => {
    expect(messages({ email: 'a@duncit.com', password: '' })).toMatch(/password/i);
  });

  it('accepts a valid email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@duncit.com', password: 'secret' }).success).toBe(true);
  });
});
