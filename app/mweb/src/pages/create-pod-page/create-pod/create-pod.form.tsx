import { z } from 'zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack } from '@mui/material';
import CreatePodSections from './CreatePodSections';
import {
  blankCreatePodForm,
  type CreatePodClub,
  type CreatePodFormValues,
  type CreatePodVenue,
} from './create-pod.types';

/** Zod schema for the host Create Pod form — mirrors the server's
 * createPartnerPod rules (venue for physical, link for virtual, paid amounts). */
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
    pod_date_time: z.date({ invalid_type_error: 'Start date/time required' }),
    pod_end_date_time: z.date().nullable(),
    pod_type: z.string().min(1, 'Select a pod type'),
    pod_amount: z.number({ invalid_type_error: 'Amount must be a number' }).min(0).max(1999),
    pod_occurrence: z.string().min(1),
    no_of_spots: z.number({ invalid_type_error: 'Spots must be a number' }).min(0).max(10000),
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
      const url = values.meeting_url;
      if (!url) {
        ctx.addIssue({ code: 'custom', path: ['meeting_url'], message: 'Meeting link is required' });
      } else if (!/^https?:\/\/\S+$/.test(url)) {
        ctx.addIssue({ code: 'custom', path: ['meeting_url'], message: 'Meeting link must be valid' });
      }
    }
    if (values.pod_date_time.getTime() <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_date_time'],
        message: 'Start date/time must be in the future',
      });
    }
    if (values.pod_end_date_time && values.pod_end_date_time <= values.pod_date_time) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_end_date_time'],
        message: 'End must be after start',
      });
    }
    if (values.pod_type.includes('FREE') && values.pod_amount !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_amount'],
        message: 'Free pods must have amount 0',
      });
    }
  });

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Maps the validated form values onto the server's CreatePodInput. */
export function buildCreatePodInput(values: CreatePodFormValues) {
  const virtual = values.pod_mode === 'VIRTUAL';
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode,
    venue_id: virtual ? null : values.venue_id,
    venue_slot_id: null,
    location_id: null,
    zone_name: null,
    meeting_platform: virtual ? values.meeting_platform.trim() || null : null,
    meeting_url: virtual ? values.meeting_url.trim() : null,
    meeting_notes: virtual ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: [],
    pod_description: values.pod_description,
    pod_date_time: values.pod_date_time?.toISOString(),
    pod_end_date_time: values.pod_end_date_time?.toISOString() ?? null,
    pod_type: values.pod_type,
    pod_amount: Number(values.pod_amount) || 0,
    pod_occurrence: values.pod_occurrence,
    no_of_spots: Number(values.no_of_spots) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
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

export type CreatePodForm = UseFormReturn<CreatePodFormValues>;

interface Props {
  clubs: CreatePodClub[];
  venues: CreatePodVenue[];
  busy: boolean;
  error: string | null;
  onSubmit: (values: CreatePodFormValues) => Promise<void> | void;
}

/** The host Create Pod form (RHF + Zod, MUI sections, MUIX date pickers). */
export default function CreatePodFormView({ clubs, venues, busy, error, onSubmit }: Readonly<Props>) {
  const form = useForm<CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: blankCreatePodForm,
    mode: 'onTouched',
  });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => onSubmit(values))}>
      <Stack spacing={1.5}>
        <Alert severity="info">
          Your approved host profile is added as the pod host automatically.
        </Alert>
        <CreatePodSections form={form} clubs={clubs} venues={venues} />
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button variant="contained" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create Pod'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
