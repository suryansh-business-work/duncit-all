import * as yup from 'yup';

export interface SupportFormValues {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  attachments: string[];
}

export const SUPPORT_CATEGORIES = [
  { value: 'BUG', label: 'Bug / Something is broken' },
  { value: 'QUESTION', label: 'Question / How do I…' },
  { value: 'FEEDBACK', label: 'Feedback / Suggestion' },
  { value: 'ACCOUNT', label: 'Account / Login' },
  { value: 'PAYMENT', label: 'Payment / Refund' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const supportInitialValues: SupportFormValues = {
  name: '',
  email: '',
  category: 'QUESTION',
  subject: '',
  message: '',
  attachments: [],
};

export const supportSchema: yup.ObjectSchema<SupportFormValues> = yup.object({
  name: yup.string().trim().min(2, 'Name must be at least 2 characters').max(120).required('Name is required'),
  email: yup.string().trim().lowercase().email('Enter a valid email').required('Email is required'),
  category: yup
    .string()
    .oneOf(
      SUPPORT_CATEGORIES.map((category) => category.value),
      'Select a valid category',
    )
    .required('Category is required'),
  subject: yup
    .string()
    .trim()
    .min(3, 'Subject must be at least 3 characters')
    .max(120, 'Subject must be 120 characters or fewer')
    .required('Subject is required'),
  message: yup
    .string()
    .trim()
    .min(10, 'Please describe in at least 10 characters')
    .max(2000, 'Message must be 2000 characters or fewer')
    .required('Message is required'),
  attachments: yup
    .array()
    .of(yup.string().url('Invalid URL').required())
    .max(5, 'Up to 5 images')
    .default([]),
});

export function toSupportTicketInput(values: SupportFormValues) {
  const cast = supportSchema.cast(values, { stripUnknown: true });
  return {
    name: cast.name,
    email: cast.email,
    category: cast.category,
    subject: cast.subject,
    message: cast.message,
    attachments: cast.attachments,
  };
}
