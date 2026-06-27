import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import RhfTextField from '../../../forms/components/RhfTextField';
import MediaPickerField from '../../../components/MediaPickerField';
import MediaListField from '../../../components/MediaListField';
import SettlementPreview from './SettlementPreview';
import type { CompletePodDialogProps, CompletePodValues } from './complete-pod.types';

export const mediaTextToInput = (value: string) =>
  value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

/** Schema depends on whether the pod has a venue: only then is a bill required. */
export const buildCompleteSchema = (hasVenue: boolean) =>
  z.object({
    host_user_id: z.string().trim().min(1, 'Select host'),
    venue_bill_amount: hasVenue
      ? z.coerce.number({ message: 'Enter a valid amount' }).gt(0, 'Venue bill must be greater than 0')
      : z.coerce.number({ message: 'Enter a valid amount' }).min(0),
    bill_url: hasVenue
      ? z.string().trim().min(1, 'Bill upload is required').url('Upload or paste a valid bill URL')
      : z.string().trim(),
    media_text: z.string().trim().min(1, 'Upload at least one party photo or video'),
    notes: z.string().trim().max(1000, 'Notes must be 1000 characters or fewer'),
  });

/** Maps validated values onto the server's CompletePodInput. */
export function buildCompleteInput(values: CompletePodValues, podId: string) {
  return {
    pod_id: podId,
    host_user_id: values.host_user_id || undefined,
    venue_bill_amount: Number(values.venue_bill_amount) || 0,
    bill_url: values.bill_url.trim() || undefined,
    evidence_media: mediaTextToInput(values.media_text),
    notes: values.notes.trim() || undefined,
  };
}

export default function CompletePodDialog({
  open,
  pod,
  users,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Readonly<CompletePodDialogProps>) {
  const hasVenue = !!pod?.venue_id;
  const hostIds = (pod?.pod_hosts_id ?? []) as string[];
  const hostOptions = hostIds.map((id) => users.find((user) => user.user_id === id) ?? { user_id: id, full_name: id });
  const initialValues: CompletePodValues = {
    host_user_id: hostOptions[0]?.user_id ?? '',
    venue_bill_amount: 0,
    bill_url: '',
    media_text: '',
    notes: '',
  };

  const { control, handleSubmit, watch, reset } = useForm<CompletePodValues>({
    defaultValues: initialValues,
    resolver: zodResolver(buildCompleteSchema(hasVenue)) as Resolver<CompletePodValues>,
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  const submit = handleSubmit((values) => onSubmit(values));
  const venueBillAmount = Number(watch('venue_bill_amount')) || 0;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Complete this pod</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="subtitle2">{pod?.pod_title}</Typography>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <form noValidate onSubmit={submit}>
            <Stack spacing={1.5}>
              <RhfTextField control={control} name="host_user_id" select label="Host">
                {hostOptions.map((host) => (
                  <MenuItem key={host.user_id} value={host.user_id}>
                    {host.full_name || host.email || host.user_id}
                  </MenuItem>
                ))}
              </RhfTextField>
              {hasVenue && (
                <>
                  <RhfTextField control={control} name="venue_bill_amount" type="number" label="Venue bill amount" />
                  <Controller
                    control={control}
                    name="bill_url"
                    render={({ field, fieldState }) => (
                      <MediaPickerField
                        label="Venue bill upload"
                        value={field.value}
                        onChange={field.onChange}
                        folder="/pod-bills"
                        helperText={fieldState.error?.message ?? ' '}
                      />
                    )}
                  />
                </>
              )}
              <Controller
                control={control}
                name="media_text"
                render={({ field, fieldState }) => (
                  <MediaListField
                    label="Party photos & videos"
                    buttonLabel="Add media"
                    value={field.value}
                    onChange={field.onChange}
                    folder="/pod-completion"
                    helperText={fieldState.error?.message ?? ' '}
                  />
                )}
              />
              {pod && <SettlementPreview podId={pod.id} venueBillAmount={venueBillAmount} />}
              <RhfTextField control={control} name="notes" label="Notes" multiline minRows={2} />
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for approval'}
              </Button>
            </Stack>
          </form>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
