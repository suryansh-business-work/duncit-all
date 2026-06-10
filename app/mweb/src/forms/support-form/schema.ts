import * as Yup from 'yup';

export interface SupportFormValues {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  attachments: string[];
}

export const DEFAULTS: SupportFormValues = {
  name: '',
  email: '',
  category: 'QUESTION',
  subject: '',
  message: '',
  attachments: [],
};

export const CATEGORIES = [
  { value: 'BUG', label: 'Bug / Something is broken' },
  { value: 'QUESTION', label: 'Question / How do I…' },
  { value: 'FEEDBACK', label: 'Feedback / Suggestion' },
  { value: 'ACCOUNT', label: 'Account / Login' },
  { value: 'PAYMENT', label: 'Payment / Refund' },
  { value: 'OTHER', label: 'Other' },
];

export const supportSchema: Yup.ObjectSchema<SupportFormValues> = Yup.object({
  name: Yup.string().trim().min(2, 'At least 2 characters').required('Name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  category: Yup.string().oneOf(CATEGORIES.map((c) => c.value)).required(),
  subject: Yup.string()
    .trim()
    .min(3, 'At least 3 characters')
    .max(120, 'Max 120 characters')
    .required('Subject is required'),
  message: Yup.string()
    .trim()
    .min(10, 'Please describe in at least 10 characters')
    .max(2000, 'Max 2000 characters')
    .required('Message is required'),
  attachments: Yup.array()
    .of(Yup.string().url('Invalid URL').required())
    .max(5, 'Up to 5 images')
    .default([]),
});
