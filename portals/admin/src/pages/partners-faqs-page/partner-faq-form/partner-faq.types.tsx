import type { PartnerFaqFormValues } from './partner-faq.form';

export type PartnerFaqTopic = 'VENUE' | 'HOST' | 'PRODUCTS';

export const PARTNER_FAQ_TOPICS: { value: PartnerFaqTopic; label: string }[] = [
  { value: 'VENUE', label: 'Venue' },
  { value: 'HOST', label: 'Host' },
  { value: 'PRODUCTS', label: 'Products' },
];

export const emptyPartnerFaqForm: PartnerFaqFormValues = {
  partner_topic: 'VENUE',
  question: '',
  answer: '',
  sort_order: 0,
  is_active: true,
};

export const toPartnerFaqForm = (item: any): PartnerFaqFormValues => ({
  partner_topic: item.partner_topic || 'VENUE',
  question: item.question || '',
  answer: item.answer || '',
  sort_order: item.sort_order ?? 0,
  is_active: item.is_active !== false,
});