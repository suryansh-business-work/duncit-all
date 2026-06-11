export type SupportCategory = 'VENUE' | 'HOST' | 'PRODUCT' | 'PAYOUT' | 'TECHNICAL' | 'OTHER';

export interface SupportFormValues {
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
}

export const SUPPORT_CATEGORIES: Array<{ value: SupportCategory; label: string }> = [
  { value: 'VENUE', label: 'Venue request' },
  { value: 'HOST', label: 'Host application' },
  { value: 'PRODUCT', label: 'Product listing' },
  { value: 'PAYOUT', label: 'Payout or earning' },
  { value: 'TECHNICAL', label: 'Technical issue' },
  { value: 'OTHER', label: 'Other' },
];

export const supportInitialValues: SupportFormValues = {
  name: '',
  email: '',
  category: 'HOST',
  subject: '',
  message: '',
};