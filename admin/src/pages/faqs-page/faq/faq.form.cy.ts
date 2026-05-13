import { describe, expect, it } from 'vitest';
import { faqFormSchema, toFaqInput } from './faq.form';

const base = {
  super_category_id: '',
  question: 'How do I host a pod?',
  answer: 'Tap host pod from the dashboard and fill the form.',
  sort_order: 0,
  is_active: true,
};

describe('faqFormSchema', () => {
  it('rejects question shorter than 5 chars', async () => {
    const error = await faqFormSchema.validate({ ...base, question: 'Hi' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/question/i);
  });
  it('rejects answer shorter than 5 chars', async () => {
    const error = await faqFormSchema.validate({ ...base, answer: 'Hi' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/answer/i);
  });
  it('accepts a valid FAQ', async () => {
    await faqFormSchema.validate(base);
  });
});

describe('toFaqInput', () => {
  it('nullifies empty super_category_id', () => {
    expect(toFaqInput(base).super_category_id).toBeNull();
  });
});
