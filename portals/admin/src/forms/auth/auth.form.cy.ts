import { describe, expect, it } from 'vitest';
import { loginSchema, toLoginPayload } from './auth.form';

const messagesOf = (input: { email: string; password: string }) => {
  const result = loginSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('admin login form schema', () => {
  it('rejects empty values with required errors', () => {
    const msg = messagesOf({ email: '', password: '' });
    expect(msg).toMatch(/email/i);
    expect(msg).toMatch(/password/i);
  });

  it('rejects invalid email format', () => {
    const msg = messagesOf({ email: 'not-an-email', password: 'longenough' });
    expect(msg).toMatch(/email/i);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const msg = messagesOf({ email: 'a@b.co', password: 'short' });
    expect(msg).toMatch(/8 characters/i);
  });

  it('accepts valid credentials and normalises through toLoginPayload', () => {
    const payload = toLoginPayload({ email: ' Admin@Example.COM ', password: 'longenough' });
    expect(payload.email).toBe('admin@example.com');
    expect(payload.password).toBe('longenough');
  });
});
