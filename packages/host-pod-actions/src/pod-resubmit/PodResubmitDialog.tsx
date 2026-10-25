import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
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
import { useAskTranslation } from './ask-translation';
import ResubmitOfferSection from './ResubmitOfferSection';
import { VenueField } from './VenueSlotFields';
import {
  buildHostResubmitInput,
  buildPodResubmitModerationInput,
  buildPodResubmitSchema,
  podResubmitInitialValues,
  type PodResubmitValues,
  type VenueOfferPrefill,
} from './pod-resubmit.form';
import ContentCheckAlert from '../ContentCheckAlert';
import { useContentCheck } from '../useContentCheck';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { HOST_RESUBMIT_POD, RESUBMIT_VENUES } from '../queries';
import type { HostPodTarget, ResubmitVenueOption } from '../types';

interface Props {
  pod: HostPodTarget | null;
  onClose: () => void;
  onSaved: () => void;
  /**
   * The terms of the offer the venue declined (or let expire): the form starts
   * from them at the pod's venue — window, space, pets, pricing option, amount,
   * the points and the note — so a new offer is an edit of the last one.
   */
  offerPrefill?: VenueOfferPrefill;
}

/** Full edit + resubmission dialog for a venue-rejected pod: pick a different
 * venue or time, the spots from the venue's minimum, how the venue is paid and
 * what the host needs from it, update the details and send the offer again —
 * the same pod is reused, no new pod is created. */
export default function PodResubmitDialog({ pod, onClose, onSaved, offerPrefill }: Readonly<Props>) {
  const { labels, renderMediaField } = useHostPodActionsConfig();
  const { t } = useAskTranslation();
  // The terms as a value, so a parent that rebuilds the object each render
  // does not reset what the host has typed since.
  const prefillKey = offerPrefill ? JSON.stringify(offerPrefill) : '';
  const prefill = useMemo<VenueOfferPrefill | null>(() => (prefillKey ? JSON.parse(prefillKey) : null), [prefillKey]);
  const form = useForm<PodResubmitValues, unknown, PodResubmitValues>({
    resolver: zodResolver(buildPodResubmitSchema(labels, t)) as unknown as Resolver<PodResubmitValues, unknown, PodResubmitValues>,
    defaultValues: podResubmitInitialValues(pod, prefill),
  });
  const { register, control, handleSubmit, reset, setValue, setError, formState: { errors } } = form;
  const venuesQ = useQuery<{ publicVenues: ResubmitVenueOption[] }>(RESUBMIT_VENUES, { skip: !pod });
  const [resubmit, resubmitState] = useMutation<{ hostResubmitPod: { id: string } }>(HOST_RESUBMIT_POD);
  const check = useContentCheck(setError);
  const busy = resubmitState.loading || check.checking;

  useEffect(() => {
    reset(podResubmitInitialValues(pod, prefill));
    check.clear();
    // `check.clear` is a fresh closure each render; re-seeding is keyed on the pod and its prefill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, prefill, reset]);

  const submit = handleSubmit(async (values) => {
    // The resubmitted copy is screened like any other edit — a rejected pod is
    // exactly where a host is most tempted to rewrite the details.
    const sent = await check.run(buildPodResubmitModerationInput(values), () =>
      resubmit({ variables: { pod_doc_id: pod?.id, input: buildHostResubmitInput(values) } }),
    );
    if (sent) onSaved();
  });

  return (
    <Dialog
      open={!!pod}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="pod-resubmit-dialog"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.resubmitTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="pod-resubmit-form"
          onSubmit={submit}
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Alert severity="info" data-testid="pod-resubmit-hint">
            {labels.resubmitHint}
          </Alert>
          <TextField
            label={labels.fieldTitle}
            required
            fullWidth
            data-testid="pod-resubmit-title"
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
            data-testid="pod-resubmit-description"
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
                  // The window and the space belonged to the venue the host moved away from.
                  setValue('offer_start', '');
                  setValue('offer_end', '');
                  setValue('space_label', '');
                }}
              />
            )}
          />
          <ResubmitOfferSection form={form} />
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
          {check.failure && (
            <Alert severity="error" data-testid="pod-resubmit-check-failure">
              {check.failure}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy} data-testid="pod-resubmit-cancel">
          {labels.cancel}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="pod-resubmit-form"
          variant="contained"
          loading={busy}
          data-testid="pod-resubmit-save"
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {busy ? labels.resubmitting : labels.resubmitCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
