import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  addVenueBillIssues,
  addVenueUsageIssues,
  buildPodCompleteInput,
  venueExtraAmountOf,
  venueUsageInput,
} from '@duncit/forms/schemas';
import { isFreePod, shellVenueBillLabels } from '@duncit/utils';
import { MediaListField } from '@duncit/media-picker';
import SettlementPreview from './SettlementPreview';
import VenueBillFields from './VenueBillFields';
import type { CompletePodDialogProps, CompletePodValues } from './complete-pod.types';
import { useTranslation } from '@duncit/shell';

export const mediaTextToInput = (value: string) =>
  value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

type Translate = ReturnType<typeof useTranslation>['t'];

/** The same rules as the host's dialog: on a paid pod at a venue the venue's
 *  final bill (its total + the file) is required as proof of the agreed amount,
 *  and extra charges are within the server's bound. `hasVenue` is false for a
 *  pod with no venue and for a free pod. Messages are copy, so the translator
 *  comes in with it. */
export const buildCompleteSchema = (hasVenue: boolean, t: Translate) => {
  const bill = shellVenueBillLabels(t);
  return z
    .object({
      host_user_id: z.string().trim().min(1, t('admin.completePod.selectHost')),
      venue_bill_amount: z.string().trim(),
      venue_bill_media: z.string(),
      venue_extra_amount: z.string().trim(),
      venue_pax: z.string().trim(),
      overtime_hours: z.string().trim(),
      media_text: z.string().trim().min(1, t('admin.completePod.mediaRequired')),
      notes: z.string().trim().max(1000, t('admin.completePod.notesTooLong')),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      addVenueUsageIssues(values, ctx, bill);
      addVenueBillIssues(values, ctx, bill);
    });
};

/** Maps validated values onto the server's CompletePodInput. The venue part is
 *  the shared `buildPodCompleteInput`: with a bill, its file and the extra
 *  charges (0 included) always go, and the old slot-price choice never does. */
export function buildCompleteInput(values: CompletePodValues, podId: string) {
  return {
    ...buildPodCompleteInput(values, podId),
    host_user_id: values.host_user_id || undefined,
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
  const { t } = useTranslation();
  // A free pod's host settles the venue directly — no bill is asked for here.
  const free = isFreePod(pod?.pod_type);
  const hasVenue = !!pod?.venue_id && !free;
  const hostIds = (pod?.pod_hosts_id ?? []) as string[];
  const hostOptions = hostIds.map((id) => users.find((user) => user.user_id === id) ?? { user_id: id, full_name: id });
  const initialValues: CompletePodValues = {
    host_user_id: hostOptions[0]?.user_id ?? '',
    venue_bill_amount: '',
    venue_bill_media: '',
    venue_extra_amount: '',
    venue_pax: '',
    overtime_hours: '',
    media_text: '',
    notes: '',
  };

  const { control, handleSubmit, watch, reset } = useForm<CompletePodValues, any, CompletePodValues>({
    defaultValues: initialValues,
    resolver: zodResolver(buildCompleteSchema(hasVenue, t)) as Resolver<CompletePodValues>,
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  const submit = handleSubmit((values) => onSubmit(values));
  const venueBillAmount = Math.max(0, Number(watch('venue_bill_amount')) || 0);
  // Paid on top of the agreed amount, so the preview re-prices with them.
  const venueExtraAmount = venueExtraAmountOf(watch('venue_extra_amount'));
  const selectedHostId = watch('host_user_id') || '';
  const paxTyped = watch('venue_pax');
  const overtimeTyped = watch('overtime_hours');
  // The venue's usage prices its slot, so the preview re-prices with it.
  const venueUsage = useMemo(
    () => venueUsageInput({ venue_pax: paxTyped, overtime_hours: overtimeTyped }),
    [paxTyped, overtimeTyped],
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('admin.completePod.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="subtitle2">{pod?.pod_title}</Typography>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <form noValidate onSubmit={submit}>
            <Stack spacing={1.5}>
              <RhfTextField control={control} name="host_user_id" select label={t('admin.completePod.host')}>
                {hostOptions.map((host) => (
                  <MenuItem key={host.user_id} value={host.user_id}>
                    {host.full_name || host.email || host.user_id}
                  </MenuItem>
                ))}
              </RhfTextField>
              {hasVenue && <VenueBillFields control={control} />}
              <Controller
                control={control}
                name="media_text"
                render={({ field, fieldState }) => (
                  <MediaListField
                    label={t('admin.completePod.media')}
                    buttonLabel="Add media"
                    value={field.value}
                    onChange={field.onChange}
                    folder="/pod-completion"
                    helperText={fieldState.error?.message ?? ' '}
                  />
                )}
              />
              {pod && (
                <SettlementPreview
                  podId={pod.id}
                  venueBillAmount={venueBillAmount}
                  venueExtraAmount={venueExtraAmount}
                  hostUserId={selectedHostId}
                  venueUsage={venueUsage}
                  free={free}
                />
              )}
              <RhfTextField control={control} name="notes" label={t('admin.contact.notes')} multiline minRows={2} />
              <DuncitButton type="submit" variant="contained" loading={busy}>
                {busy ? 'Completing…' : 'Complete pod'}
              </DuncitButton>
            </Stack>
          </form>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
