import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client';
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
import { useHostPodActionsConfig } from './HostPodActionsProvider';
import ContentCheckAlert from './ContentCheckAlert';
import { useContentCheck } from './useContentCheck';
import PodSpotsField from './PodSpotsField';
import { HOST_UPDATE_POD, POD_SPOT_LIMITS } from './queries';
import {
  buildHostUpdateInput,
  buildPodEditModerationInput,
  podEditInitialValues,
  buildPodEditSchema,
  type PodEditValues,
} from './pod-edit.form';
import type { HostPodTarget, PodSpotLimits } from './types';

interface Props {
  pod: HostPodTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Host's pod edit dialog — title, images, description and the pod's capacity.
 *
 * "Flexible pod count": a pod published with fewer spots than the space it
 * booked can hold is not stuck that way. The range comes from the server, which
 * guards the write with the same rules — a host may only ever raise it, a Club
 * Admin or an admin may also lower it but never below the seats already sold.
 *
 * Saving runs the SAME content check publishing does. A pod that met the
 * guidelines the day it was created can be renamed into one that does not, and
 * until this check existed the edit screen was the way past them: the flagged
 * word simply arrived a day late.
 */
export default function PodEditDialog({ pod, onClose, onSaved }: Readonly<Props>) {
  const { labels, renderMediaField } = useHostPodActionsConfig();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PodEditValues>({
    resolver: zodResolver(buildPodEditSchema(labels)),
    defaultValues: podEditInitialValues(pod),
  });
  const [save, saveState] = useMutation(HOST_UPDATE_POD);
  // Network-only: capacity and seats sold both move while the dialog is closed,
  // and a cached range would offer seats that are already gone.
  const limitsQuery = useQuery<{ podSpotLimits: PodSpotLimits }>(POD_SPOT_LIMITS, {
    variables: { pod_doc_id: pod?.id },
    skip: !pod?.id,
    fetchPolicy: 'network-only',
  });
  const limits = limitsQuery.data?.podSpotLimits ?? null;
  const check = useContentCheck(setError);
  const busy = saveState.loading || check.checking;

  useEffect(() => {
    reset(podEditInitialValues(pod));
    check.clear();
    // `check.clear` is a fresh closure each render; re-seeding is keyed on the pod.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  // The limits land after the reset above, so the capacity is seeded from the
  // SERVER's current figure rather than the row the list happened to hold.
  useEffect(() => {
    if (limits) setValue('no_of_spots', limits.current);
  }, [limits, setValue]);

  const submit = handleSubmit(async (values) => {
    const input = buildHostUpdateInput(values, { includeSpots: !!limits });
    const saved = await check.run(buildPodEditModerationInput(values), () =>
      save({ variables: { pod_doc_id: pod?.id, input } }),
    );
    if (saved) onSaved();
  });

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.editPod}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-edit-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
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
          {limits && (
            <Controller
              control={control}
              name="no_of_spots"
              render={({ field, fieldState }) => (
                <PodSpotsField
                  limits={limits}
                  labels={labels}
                  value={Number(field.value) || limits.current}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
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
          form="pod-edit-form"
          variant="contained"
          disabled={busy}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {busy ? labels.saving : labels.saveChanges}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
