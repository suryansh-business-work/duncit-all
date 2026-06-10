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

describe('supportSchema', () => {
  it('requires account identity fields', async () => {
    const error = await supportSchema.validate({ ...valid, name: '', email: '' }, { abortEarly: false }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/name/i);
    expect(error.errors.join(' ')).toMatch(/email/i);
  });

  it('rejects invalid category and short message', async () => {
    const error = await supportSchema.validate({ ...valid, category: 'BAD' as any, message: 'short' }, { abortEarly: false }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/category/i);
    expect(error.errors.join(' ')).toMatch(/message/i);
  });

  it('normalises input for submitContactForm', () => {
    expect(toContactInput(valid)).toMatchObject({ email: 'partner@example.com', subject: '[HOST] Venue request is stuck' });
  });
});