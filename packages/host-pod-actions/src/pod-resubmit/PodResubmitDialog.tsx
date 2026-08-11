import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client';
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
import { SlotField, VenueField } from './VenueSlotFields';
import {
  buildHostResubmitInput,
  podResubmitInitialValues,
  podResubmitSchema,
  type PodResubmitValues,
} from './pod-resubmit.form';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { HOST_RESUBMIT_POD, RESUBMIT_VENUES, RESUBMIT_VENUE_SLOTS } from '../queries';
import type { HostPodTarget, ResubmitSlotOption, ResubmitVenueOption } from '../types';

interface Props {
  pod: HostPodTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Full edit + resubmission dialog for a venue-rejected pod: pick a different
 * venue or time slot, update the details and send the booking request again —
 * the same pod is reused, no new pod is created. */
export default function PodResubmitDialog({ pod, onClose, onSaved }: Readonly<Props>) {
  const { renderMediaField } = useHostPodActionsConfig();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PodResubmitValues>({
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
      <DialogTitle sx={{ fontWeight: 700 }}>Edit &amp; resubmit pod</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="pod-resubmit-form"
          onSubmit={submit}
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Alert severity="info">
            Select a different venue or choose a different time slot — your booking request is sent
            to the venue again when you resubmit. Your pod is kept, no new pod is created.
          </Alert>
          <TextField
            label="Title"
            required
            fullWidth
            {...register('pod_title')}
            error={!!errors.pod_title}
            helperText={errors.pod_title?.message}
          />
          <TextField
            label="Description"
            required
            fullWidth
            multiline
            minRows={4}
            {...register('pod_description')}
            error={!!errors.pod_description}
            helperText={errors.pod_description?.message}
          />
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
            render={({ field, fieldState }) =>
              renderMediaField({
                value: field.value,
                onChange: field.onChange,
                error: fieldState.error?.message,
                label: 'Media',
              })
            }
          />
          {resubmitState.error && <Alert severity="error">{resubmitState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={resubmitState.loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="pod-resubmit-form"
          variant="contained"
          disabled={resubmitState.loading}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {resubmitState.loading ? 'Resubmitting…' : 'Resubmit request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
