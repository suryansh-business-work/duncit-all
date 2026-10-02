import { describe, expect, it } from 'vitest';
import { supportSchema, supportInitialValues, toSupportTicketInput } from './support.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

const valid = {
  ...supportInitialValues,
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'Cannot log in',
  message: 'I am unable to log in even with a fresh password reset.',
};

describe('supportSchema', () => {
  it('rejects empty name', () => {
    expect(errorText(supportSchema.safeParse({ ...valid, name: '' }))).toMatch(/name/i);
  });
  it('rejects invalid email', () => {
    expect(errorText(supportSchema.safeParse({ ...valid, email: 'not-an-email' }))).toMatch(/email/i);
  });
  it('rejects subject too short', () => {
    expect(errorText(supportSchema.safeParse({ ...valid, subject: 'X' }))).toMatch(/subject/i);
  });
  it('rejects message too short', () => {
    expect(errorText(supportSchema.safeParse({ ...valid, message: 'short' }))).toMatch(/at least 10|message/i);
  });
  it('rejects invalid category', () => {
    expect(errorText(supportSchema.safeParse({ ...valid, category: 'INVALID' as any }))).toMatch(/category/i);
  });
  it('rejects more than 5 attachments', () => {
    const result = supportSchema.safeParse({ ...valid, attachments: Array.from({ length: 6 }, (_, i) => `https://x/${i}.png`) });
    expect(errorText(result)).toMatch(/5 images/i);
  });
  it('rejects attachment URL that is not a URL', () => {
    expect(errorText(supportSchema.safeParse({ ...valid, attachments: ['not-a-url'] as any }))).toMatch(/url/i);
  });
  it('accepts valid input', () => {
    expect(supportSchema.safeParse(valid).success).toBe(true);
  });
});

describe('toSupportTicketInput', () => {
  it('lowercases the email', () => {
    const input = toSupportTicketInput({ ...valid, email: 'JANE@EXAMPLE.COM' });
    expect(input.email).toBe('jane@example.com');
  });
});
