import { describe, expect, it } from 'vitest';
import { partnerFaqSchema, toPartnerFaqInput, type PartnerFaqFormValues } from './partner-faq.form';

const base: PartnerFaqFormValues = {
  partner_topic: 'VENUE',
  question: 'How does venue approval work?',
  answer: 'Submit venue details and the admin team reviews the application.',
  sort_order: 0,
  is_active: true,
};

describe('partnerFaqSchema', () => {
  it('requires a partner topic', async () => {
    const error = await partnerFaqSchema.validate({ ...base, partner_topic: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/topic/i);
  });

  it('rejects short questions', async () => {
    const error = await partnerFaqSchema.validate({ ...base, question: 'Hi' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/question/i);
  });

  it('builds a partner FAQ input', () => {
    expect(toPartnerFaqInput(base)).toMatchObject({ audience: 'PARTNERS', partner_topic: 'VENUE' });
  });
});