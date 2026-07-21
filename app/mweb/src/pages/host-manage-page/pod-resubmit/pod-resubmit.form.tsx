import { useEffect } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { hasImageLine } from '../../create-pod-page/create-pod/create-pod.form';
import MediaUrlsField from '../../create-pod-page/create-pod/fields/MediaUrlsField';
import { SlotField, VenueField } from './VenueSlotFields';
import {
  blankPodResubmitValues,
  type HostPodForResubmit,
  type PodResubmitValues,
  type ResubmitSlotOption,
  type ResubmitVenueOption,
} from './pod-resubmit.types';

export const RESUBMIT_VENUES = gql`
  query ResubmitVenues {
    publicVenues {
      id
      venue_name
      city
    }
  }
`;

export const RESUBMIT_VENUE_SLOTS = gql`
  query ResubmitVenueSlots($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      price
      space_label
    }
  }
`;

export const HOST_RESUBMIT_POD = gql`
  mutation HostResubmitPod($pod_doc_id: ID!, $input: HostResubmitPodInput!) {
    hostResubmitPod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      venue_approval_status
      is_active
    }
  }
`;

export const podResubmitSchema = z.object({
  pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
  pod_description: z.string().trim().min(10, 'Add a longer description'),
  media_text: z.string().refine((text) => hasImageLine(text), 'Add at least one image URL'),
  venue_id: z.string().min(1, 'Select a venue'),
  venue_slot_id: z.string().min(1, 'Select a time slot'),
});

/** Maps the validated values onto the server's HostResubmitPodInput. */
export function buildHostResubmitInput(values: PodResubmitValues) {
  const mediaLines = values.media_text.split('\n').map((item) => item.trim()).filter(Boolean);
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: mediaLines.map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
    })),
    venue_id: values.venue_id,
    venue_slot_id: values.venue_slot_id,
  };
}

/** Prefills the form from the rejected pod (a fresh venue + slot must be picked). */
export function podResubmitInitialValues(pod: HostPodForResubmit | null): PodResubmitValues {
  if (!pod) return blankPodResubmitValues;
  return {
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    media_text: (pod.pod_images_and_videos ?? []).map((m) => m.url).join('\n'),
    venue_id: '',
    venue_slot_id: '',
  };
}

/** "Wed, 5 Mar, 6:00 pm – 8:00 pm · Hall A · ₹400" — one slot option line. */
export function slotOptionLabel(slot: ResubmitSlotOption): string {
  const start = new Date(slot.start_at);
  const end = new Date(slot.end_at);
  const day = start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = `${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  const space = slot.space_label ? ` · ${slot.space_label}` : '';
  const price = slot.price > 0 ? ` · ₹${slot.price}` : '';
  return `${day}, ${time}${space}${price}`;
}

interface PodResubmitFormProps {
  pod: HostPodForResubmit | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Full edit + resubmission dialog for a venue-rejected pod: pick a different
 * venue or time slot, update the details and send the booking request again —
 * the same pod is reused, no new pod is created. */
export default function PodResubmitForm({ pod, onClose, onSaved }: Readonly<PodResubmitFormProps>) {
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<PodResubmitValues>({
      resolver: zodResolver(podResubmitSchema),
      defaultValues: podResubmitInitialValues(pod),
    });
  const venueId = watch('venue_id');
  const venuesQ = useQuery<{ publicVenues: ResubmitVenueOption[] }>(RESUBMIT_VENUES, { skip: !pod });
  const slotsQ = useQuery<{ venueAvailableSlots: ResubmitSlotOption[] }>(RESUBMIT_VENUE_SLOTS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const [resubmit, resubmitState] = useMutation(HOST_RESUBMIT_POD);

  useEffect(() => {
    reset(podResubmitInitialValues(pod));
  }, [pod, reset]);

  const submit = handleSubmit(async (values) => {
    await resubmit({ variables: { pod_doc_id: pod?.id, input: buildHostResubmitInput(values) } });
    onSaved();
  });

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Edit & resubmit pod</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-resubmit-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="info">
            Select a different venue or choose a different time slot — your booking request is sent
            to the venue again when you resubmit. Your pod is kept, no new pod is created.
          </Alert>
          <TextField label="Title" required fullWidth {...register('pod_title')} error={!!errors.pod_title} helperText={errors.pod_title?.message} />
          <TextField label="Description" required fullWidth multiline minRows={4} {...register('pod_description')} error={!!errors.pod_description} helperText={errors.pod_description?.message} />
          <Controller
            control={control}
            name="venue_id"
            render={({ field, fieldState }) => (
              <VenueField
                venues={venuesQ.data?.publicVenues ?? []}
                value={field.value}
                error={fieldState.error?.message}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('venue_slot_id', '');
                }}
              />
            )}
          />
          <Controller
            control={control}
            name="venue_slot_id"
            render={({ field, fieldState }) => (
              <SlotField
                slots={slotsQ.data?.venueAvailableSlots ?? []}
                loading={!!venueId && slotsQ.loading}
                disabled={!venueId}
                value={field.value}
                error={fieldState.error?.message}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="media_text"
            render={({ field, fieldState }) => (
              <MediaUrlsField value={field.value} onChange={field.onChange} error={fieldState.error?.message} label="Media" />
            )}
          />
          {resubmitState.error && <Alert severity="error">{resubmitState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={resubmitState.loading}>Cancel</Button>
        <Button type="submit" form="pod-resubmit-form" variant="contained" disabled={resubmitState.loading} sx={{ borderRadius: 999, fontWeight: 900 }}>
          {resubmitState.loading ? 'Resubmitting…' : 'Resubmit request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
