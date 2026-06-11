import { parse } from 'date-fns';
import { z } from 'zod';

import {
  CategoryMediaType,
  type PodMode,
  type PodOccurrence,
  type PodType,
} from '@/generated/graphql/graphql';
import type { CreatePodFormValues } from './create-pod.types';

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm';
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Parses the form's `YYYY-MM-DD HH:mm` local date-time text; null when invalid. */
export function parseDateTimeText(text: string): Date | null {
  if (!DATE_TIME_RE.test(text)) return null;
  const date = parse(text, DATE_TIME_FORMAT, new Date());
  return Number.isNaN(date.getTime()) ? null : date;
}

const intIn = (min: number, max: number) => (text: string) => {
  const value = Number(text);
  return Number.isFinite(value) && value >= min && value <= max;
};

/** Zod schema for the host Create Pod screen — same rules as mWeb's form
 * (venue for physical, link for virtual, future start, free = amount 0). */
export const createPodSchema = z
  .object({
    pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
    club_id: z.string().min(1, 'Select a club'),
    pod_mode: z.enum(['PHYSICAL', 'VIRTUAL']),
    venue_id: z.string(),
    meeting_platform: z.string().trim().max(80),
    meeting_url: z.string().trim(),
    meeting_notes: z.string().trim().max(1000),
    pod_description: z.string().trim().min(10, 'Add a longer description'),
    pod_info: z.string().max(2000),
    pod_date_time_text: z
      .string()
      .refine((text) => !!parseDateTimeText(text), 'Use YYYY-MM-DD HH:mm'),
    pod_end_date_time_text: z
      .string()
      .refine((text) => text === '' || !!parseDateTimeText(text), 'Use YYYY-MM-DD HH:mm'),
    pod_type: z.string().min(1),
    pod_amount_text: z.string().refine(intIn(0, 1999), 'Amount must be 0–1999'),
    pod_occurrence: z.string().min(1),
    no_of_spots_text: z.string().refine(intIn(0, 10000), 'Spots must be 0–10000'),
    pod_hashtag_text: z.string().max(500),
    media_text: z.string(),
    what_this_pod_offers_text: z.string().max(1000),
    available_perks_text: z.string().max(1000),
    payment_terms: z.string().max(4000),
  })
  .superRefine((values, ctx) => {
    if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
      ctx.addIssue({ code: 'custom', path: ['venue_id'], message: 'Select a venue' });
    }
    if (values.pod_mode === 'VIRTUAL') {
      if (!values.meeting_url) {
        ctx.addIssue({
          code: 'custom',
          path: ['meeting_url'],
          message: 'Meeting link is required',
        });
      } else if (!/^https?:\/\/\S+$/.test(values.meeting_url)) {
        ctx.addIssue({
          code: 'custom',
          path: ['meeting_url'],
          message: 'Meeting link must be valid',
        });
      }
    }
    const start = parseDateTimeText(values.pod_date_time_text);
    if (start && start.getTime() <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_date_time_text'],
        message: 'Start must be in the future',
      });
    }
    const end = parseDateTimeText(values.pod_end_date_time_text);
    if (start && end && end <= start) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_end_date_time_text'],
        message: 'End must be after start',
      });
    }
    if (values.pod_type.includes('FREE') && Number(values.pod_amount_text) !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_amount_text'],
        message: 'Free pods must have amount 0',
      });
    }
  });

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Maps validated form values onto the server's CreatePodInput. */
export function buildCreatePodInput(values: CreatePodFormValues) {
  const virtual = values.pod_mode === 'VIRTUAL';
  const start = parseDateTimeText(values.pod_date_time_text);
  if (!start) throw new Error('Invalid start date/time');
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode as PodMode,
    venue_id: virtual ? null : values.venue_id,
    venue_slot_id: null,
    location_id: null,
    zone_name: null,
    meeting_platform: virtual ? values.meeting_platform.trim() || null : null,
    meeting_url: virtual ? values.meeting_url.trim() : null,
    meeting_notes: virtual ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: [],
    pod_description: values.pod_description,
    pod_date_time: start.toISOString(),
    pod_end_date_time: parseDateTimeText(values.pod_end_date_time_text)?.toISOString() ?? null,
    pod_type: values.pod_type as PodType,
    pod_amount: Number(values.pod_amount_text) || 0,
    pod_occurrence: values.pod_occurrence as PodOccurrence,
    no_of_spots: Number(values.no_of_spots_text) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    payment_terms: values.payment_terms || null,
    what_this_pod_offers: splitLines(values.what_this_pod_offers_text),
    available_perks: splitLines(values.available_perks_text),
    place_charges: [],
    products_enabled: false,
    product_requests: [],
    is_active: true,
  };
}
