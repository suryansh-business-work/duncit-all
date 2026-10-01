import { z } from 'zod';

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

export const supportSchema = z.object({
  name: z
    .string({ error: (issue) => (issue.code === 'invalid_type' ? 'Name is required' : undefined) })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email({ pattern: z.regexes.html5Email, error: 'Enter a valid email' }),
  category: z.enum(
    SUPPORT_CATEGORIES.map((category) => category.value),
    { error: (issue) => (issue.input === undefined ? 'Category is required' : 'Select a valid category') },
  ),
  subject: z
    .string({ error: 'Subject is required' })
    .trim()
    .min(3, 'Subject must be at least 3 characters')
    .max(120, 'Subject must be 120 characters or fewer'),
  message: z
    .string({ error: 'Message is required' })
    .trim()
    .min(10, 'Please describe in at least 10 characters')
    .max(2000, 'Message must be 2000 characters or fewer'),
  attachments: z
    .array(z.httpUrl('Invalid URL'))
    .max(5, 'Up to 5 images')
    .default([]),
}) satisfies z.ZodType<SupportFormValues>;

export function toSupportTicketInput(values: SupportFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    category: values.category,
    subject: values.subject.trim(),
    message: values.message.trim(),
    attachments: values.attachments,
  };
}
