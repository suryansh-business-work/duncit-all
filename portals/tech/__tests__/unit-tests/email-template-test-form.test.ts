import { describe, expect, it } from 'vitest';
import {
  emailTemplateTestSchema,
  toSendTestInput,
} from '../../src/pages/email-templates-page/email-template-test/email-template-test.form';

const firstError = (result: ReturnType<typeof emailTemplateTestSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('emailTemplateTestSchema', () => {
  it('rejects empty recipient', () => {
    expect(firstError(emailTemplateTestSchema.safeParse({ to: '' }))).toMatch(/email/i);
  });
  it('rejects invalid email format', () => {
    expect(firstError(emailTemplateTestSchema.safeParse({ to: 'not-an-email' }))).toMatch(/email/i);
  });
  it('accepts and lowercases a valid email', () => {
    const result = emailTemplateTestSchema.safeParse({ to: 'Test@Example.COM' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.to).toBe('test@example.com');
  });
});

describe('toSendTestInput', () => {
  it('casts and normalises the recipient email', () => {
    expect(toSendTestInput({ to: 'User@Example.COM' })).toEqual({ to: 'user@example.com' });
  });
});
