import { z } from 'zod';

export interface SupportFormValues {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  attachments: string[];
  /** Attached pod (set when Contact Support was opened from a pod). */
  pod_id?: string;
  pod_title?: string;
}

export const DEFAULTS: SupportFormValues = {
  name: '',
  email: '',
  category: 'QUESTION',
  subject: '',
  message: '',
  attachments: [],
  pod_id: '',
  pod_title: '',
};

export const CATEGORIES = [
  { value: 'BUG', label: 'Bug / Something is broken' },
  { value: 'QUESTION', label: 'Question / How do I…' },
  { value: 'FEEDBACK', label: 'Feedback / Suggestion' },
  { value: 'ACCOUNT', label: 'Account / Login' },
  { value: 'PAYMENT', label: 'Payment / Refund' },
  { value: 'OTHER', label: 'Other' },
];

const categoryValues = CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const supportSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(2, 'At least 2 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  category: z.enum(categoryValues),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .min(3, 'At least 3 characters')
    .max(120, 'Max 120 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .min(10, 'Please describe in at least 10 characters')
    .max(2000, 'Max 2000 characters'),
  attachments: z.array(z.string().url('Invalid URL')).max(5, 'Up to 5 files').default([]),
  pod_id: z.string().optional(),
  pod_title: z.string().optional(),
});
