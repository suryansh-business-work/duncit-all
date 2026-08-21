import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
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
import { useHostPodActionsConfig } from './HostPodActionsProvider';
import ContentCheckAlert from './ContentCheckAlert';
import { useContentCheck } from './useContentCheck';
import { HOST_UPDATE_POD } from './queries';
import {
  buildHostUpdateInput,
  buildPodEditModerationInput,
  podEditInitialValues,
  podEditSchema,
  type PodEditValues,
} from './pod-edit.form';
import type { HostPodTarget } from './types';

interface Props {
  pod: HostPodTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Host's limited pod edit dialog — only title, images and description.
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
    setError,
    formState: { errors },
  } = useForm<PodEditValues>({
    resolver: zodResolver(podEditSchema),
    defaultValues: podEditInitialValues(pod),
  });
  const [save, saveState] = useMutation(HOST_UPDATE_POD);
  const check = useContentCheck(setError);
  const busy = saveState.loading || check.checking;

  useEffect(() => {
    reset(podEditInitialValues(pod));
    check.clear();
    // `check.clear` is a fresh closure each render; re-seeding is keyed on the pod.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  const submit = handleSubmit(async (values) => {
    const saved = await check.run(buildPodEditModerationInput(values), () =>
      save({ variables: { pod_doc_id: pod?.id, input: buildHostUpdateInput(values) } }),
    );
    if (saved) onSaved();
  });

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Edit pod</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-edit-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
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
          <ContentCheckAlert violations={check.blocked} title={labels.contentCheck} />
          {check.failure && <Alert severity="error">{check.failure}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="pod-edit-form"
          variant="contained"
          disabled={busy}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
