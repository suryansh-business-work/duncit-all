import { useEffect } from 'react';
import { Controller, useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SlotField, VenueField } from './VenueSlotFields';
import {
  buildHostResubmitInput,
  buildPodResubmitModerationInput,
  podResubmitInitialValues,
  podResubmitSchema,
  type PodResubmitValues,
} from './pod-resubmit.form';
import ContentCheckAlert from '../ContentCheckAlert';
import { useContentCheck } from '../useContentCheck';
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
  const { labels, renderMediaField } = useHostPodActionsConfig();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<PodResubmitValues, any, PodResubmitValues>({
    resolver: zodResolver(podResubmitSchema) as unknown as Resolver<PodResubmitValues, any, PodResubmitValues>,
    defaultValues: podResubmitInitialValues(pod),
  });
  const venueId = watch('venue_id');
  const venuesQ = useQuery<{ publicVenues: ResubmitVenueOption[] }>(RESUBMIT_VENUES, { skip: !pod });
  const slotsQ = useQuery<{ venueAvailableSlots: ResubmitSlotOption[] }>(RESUBMIT_VENUE_SLOTS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const [resubmit, resubmitState] = useMutation<any>(HOST_RESUBMIT_POD);
  const check = useContentCheck(setError);
  const busy = resubmitState.loading || check.checking;

  useEffect(() => {
    reset(podResubmitInitialValues(pod));
    check.clear();
    // `check.clear` is a fresh closure each render; re-seeding is keyed on the pod.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  const submit = handleSubmit(async (values) => {
    // The resubmitted copy is screened like any other edit — a rejected pod is
    // exactly where a host is most tempted to rewrite the details.
    const sent = await check.run(buildPodResubmitModerationInput(values), () =>
      resubmit({ variables: { pod_doc_id: pod?.id, input: buildHostResubmitInput(values) } }),
    );
    if (sent) onSaved();
  });

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.resubmitTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="pod-resubmit-form"
          onSubmit={submit}
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Alert severity="info">{labels.resubmitHint}</Alert>
          <TextField
            label={labels.fieldTitle}
            required
            fullWidth
            {...register('pod_title')}
            error={!!errors.pod_title}
            helperText={errors.pod_title?.message}
          />
          <TextField
            label={labels.fieldDescription}
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
                label: labels.fieldMedia,
              })
            }
          />
          <ContentCheckAlert violations={check.blocked} title={labels.contentCheck} />
          {check.failure && <Alert severity="error">{check.failure}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {labels.cancel}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="pod-resubmit-form"
          variant="contained"
          disabled={busy}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {busy ? labels.resubmitting : labels.resubmitCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
