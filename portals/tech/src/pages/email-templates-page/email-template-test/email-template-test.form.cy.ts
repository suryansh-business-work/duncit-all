import { describe, expect, it } from 'vitest';
import { emailTemplateTestSchema, toSendTestInput } from './email-template-test.form';

describe('emailTemplateTestSchema', () => {
  it('rejects empty recipient', async () => {
    const error = await emailTemplateTestSchema.validate({ to: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/email/i);
  });
  it('rejects invalid email format', async () => {
    const error = await emailTemplateTestSchema.validate({ to: 'not-an-email' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/email/i);
  });
  it('accepts and lowercases a valid email', async () => {
    const parsed = await emailTemplateTestSchema.validate({ to: 'Test@Example.COM' });
    expect(parsed.to).toBe('test@example.com');
  });
});

describe('toSendTestInput', () => {
  it('casts and normalises the recipient email', () => {
    expect(toSendTestInput({ to: 'User@Example.COM' })).toEqual({ to: 'user@example.com' });
  });
});
