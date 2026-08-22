import { describe, expect, it } from 'vitest';
import { buildPartnerFaqSchema, toPartnerFaqInput, type PartnerFaqFormValues } from './partner-faq.form';

/** The spec reads keys back, so an identity translator keeps its assertions. */
const t = (key: string) => key;

const base: PartnerFaqFormValues = {
  partner_topic: 'VENUE',
  question: 'How does venue approval work?',
  answer: 'Submit venue details and the admin team reviews the application.',
  sort_order: 0,
  is_active: true,
};

const messagesOf = (input: unknown) => {
  const result = buildPartnerFaqSchema(t).safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('buildPartnerFaqSchema', () => {
  it('requires a partner topic', () => {
    expect(messagesOf({ ...base, partner_topic: '' })).toMatch(/topic/i);
  });

  it('rejects short questions', () => {
    expect(messagesOf({ ...base, question: 'Hi' })).toMatch(/question/i);
  });

  it('builds a partner FAQ input', () => {
    expect(toPartnerFaqInput(base, t)).toMatchObject({ audience: 'PARTNERS', partner_topic: 'VENUE' });
  });
});
