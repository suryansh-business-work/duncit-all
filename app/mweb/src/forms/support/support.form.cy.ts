import { describe, expect, it } from 'vitest';
import { supportSchema, supportInitialValues, toSupportTicketInput } from './support.form';

const valid = {
  ...supportInitialValues,
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'Cannot log in',
  message: 'I am unable to log in even with a fresh password reset.',
};

describe('supportSchema', () => {
  it('rejects empty name', async () => {
    const error = await supportSchema.validate({ ...valid, name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/name/i);
  });
  it('rejects invalid email', async () => {
    const error = await supportSchema.validate({ ...valid, email: 'not-an-email' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/email/i);
  });
  it('rejects subject too short', async () => {
    const error = await supportSchema.validate({ ...valid, subject: 'X' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/subject/i);
  });
  it('rejects message too short', async () => {
    const error = await supportSchema.validate({ ...valid, message: 'short' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/at least 10|message/i);
  });
  it('rejects invalid category', async () => {
    const error = await supportSchema.validate({ ...valid, category: 'INVALID' as any }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/category/i);
  });
  it('rejects more than 5 attachments', async () => {
    const error = await supportSchema
      .validate({ ...valid, attachments: Array.from({ length: 6 }, (_, i) => `https://x/${i}.png`) }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/5 images/i);
  });
  it('rejects attachment URL that is not a URL', async () => {
    const error = await supportSchema.validate({ ...valid, attachments: ['not-a-url'] as any }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/url/i);
  });
  it('accepts valid input', async () => {
    await expect(supportSchema.validate(valid)).resolves.toBeTruthy();
  });
});

describe('toSupportTicketInput', () => {
  it('lowercases the email', () => {
    const input = toSupportTicketInput({ ...valid, email: 'JANE@EXAMPLE.COM' });
    expect(input.email).toBe('jane@example.com');
  });
});
