import { useTranslation } from '@duncit/shell';
export type SupportCategory = 'VENUE' | 'HOST' | 'PRODUCT' | 'PAYOUT' | 'TECHNICAL' | 'OTHER';

export interface SupportFormValues {
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
}

type Translate = ReturnType<typeof useTranslation>['t'];

export const supportCategories = (t: Translate): Array<{ value: SupportCategory; label: string }> =>[
  { value: 'VENUE', label: t('partners.forms.venueRequest') },
  { value: 'HOST', label: t('partners.forms.hostApplication') },
  { value: 'PRODUCT', label: t('partners.forms.productListing') },
  { value: 'PAYOUT', label: t('partners.forms.payoutOrEarning') },
  { value: 'TECHNICAL', label: t('partners.forms.technicalIssue') },
  { value: 'OTHER', label: t('partners.forms.other') },
];

export const supportInitialValues: SupportFormValues = {
  name: '',
  email: '',
  category: 'HOST',
  subject: '',
  message: '',
};