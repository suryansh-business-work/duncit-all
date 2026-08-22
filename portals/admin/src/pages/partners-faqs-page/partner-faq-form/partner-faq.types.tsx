import type { PartnerFaqFormValues } from './partner-faq.form';
import { useTranslation } from '@duncit/shell';

export type PartnerFaqTopic = 'VENUE' | 'HOST' | 'PRODUCTS';

type Translate = ReturnType<typeof useTranslation>['t'];

export const partnerFaqTopics = (t: Translate): { value: PartnerFaqTopic; label: string }[] => [
  { value: 'VENUE', label: t('admin.faqs.audienceVenue') },
  { value: 'HOST', label: t('admin.faqs.audienceHost') },
  { value: 'PRODUCTS', label: t('admin.faqs.audienceProducts') },
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