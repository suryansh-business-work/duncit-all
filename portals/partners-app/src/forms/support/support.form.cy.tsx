import { describe, expect, it } from 'vitest';
import { supportInitialValues } from './support.types';
import { supportSchema, toContactInput } from './support.form';

const valid = {
  ...supportInitialValues,
  name: 'Partner User',
  email: 'partner@example.com',
  subject: 'Venue request is stuck',
  message: 'My venue request was submitted but I need help with the review status.',
};

const messages = (result: ReturnType<typeof supportSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('supportSchema', () => {
  it('requires account identity fields', () => {
    const result = supportSchema.safeParse({ ...valid, name: '', email: '' });
    expect(messages(result)).toMatch(/name/i);
    expect(messages(result)).toMatch(/email/i);
  });

  it('rejects invalid category and short message', () => {
    const result = supportSchema.safeParse({ ...valid, category: 'BAD' as never, message: 'short' });
    expect(messages(result)).toMatch(/category/i);
    expect(messages(result)).toMatch(/message/i);
  });

  it('normalises input for submitContactForm', () => {
    expect(toContactInput(valid)).toMatchObject({ email: 'partner@example.com', subject: '[HOST] Venue request is stuck' });
  });
});
