import { z } from 'zod';

const isUrl = (value: string) => {
  try {
    void new URL(value);
    return true;
  } catch {
    return false;
  }
};

const productRequestSchema = z.object({
  product_id: z.string().min(1, 'Select product'),
  quantity: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? Number.NaN : Number(value)),
    z.number({ invalid_type_error: 'Quantity required' }).min(1).max(10000),
  ),
});

export const partnerPodSchema = z
  .object({
    pod_title: z.string().trim().min(3, 'Title is too short').max(120).min(1, 'Title required'),
    club_id: z.string().min(1, 'Select a club'),
    venue_id: z.string().default(''),
    venue_slot_id: z.string().default(''),
    pod_mode: z.enum(['PHYSICAL', 'VIRTUAL']),
    meeting_platform: z.string().trim().max(80).default(''),
    meeting_url: z.string().trim().default(''),
    meeting_notes: z.string().trim().max(1000).default(''),
    pod_description: z.string().trim().min(10, 'Add a longer description').min(1, 'Description required'),
    pod_date_time: z.date({ invalid_type_error: 'Start date/time required' }).nullable(),
    pod_end_date_time: z.date().nullable(),
    pod_type: z.string().min(1),
    pod_amount: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? Number.NaN : Number(value)),
      z.number({ invalid_type_error: 'Amount must be a number' }).min(0).max(1999),
    ),
    pod_occurrence: z.string().min(1),
    no_of_spots: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? Number.NaN : Number(value)),
      z.number({ invalid_type_error: 'Spots must be a number' }).min(0).max(10000),
    ),
    pod_info: z.string().max(2000).default(''),
    pod_hashtag_text: z.string().max(500).default(''),
    media_text: z.string().default(''),
    payment_terms: z.string().max(4000).default(''),
    what_this_pod_offers_text: z.string().max(1000).default(''),
    available_perks_text: z.string().max(1000).default(''),
    products_enabled: z.boolean().default(false),
    product_requests: z.array(productRequestSchema).default([]),
  })
  .superRefine((values, ctx) => {
    if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_id'], message: 'Select a venue' });
    }
    if (values.pod_mode === 'PHYSICAL' && values.venue_id && !values.venue_slot_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_slot_id'], message: 'Pick an available slot' });
    }
    if (values.pod_mode === 'VIRTUAL') {
      if (!values.meeting_url) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meeting_url'], message: 'Meeting link is required' });
      } else if (!isUrl(values.meeting_url)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meeting_url'], message: 'Meeting link must be valid' });
      }
    }
    if (!values.pod_date_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_date_time'], message: 'Start date/time required' });
    } else if (values.pod_date_time.getTime() <= Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_date_time'], message: 'Start date/time must be after current date/time' });
    }
    if (values.pod_end_date_time && values.pod_date_time && values.pod_end_date_time.getTime() <= values.pod_date_time.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_end_date_time'], message: 'End must be after start' });
    }
    if (values.pod_type.includes('FREE') && values.pod_amount !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_amount'], message: 'Free pods must have amount 0' });
    }
    if (values.products_enabled && values.product_requests.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['product_requests'], message: 'Select at least one approved product' });
    }
  });
