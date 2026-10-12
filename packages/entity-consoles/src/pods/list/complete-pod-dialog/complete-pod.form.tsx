import { useEffect } from 'react';
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
import { firstMediaUrl } from '@duncit/utils';
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

/** The venue bill is optional — without one the booked slot price stands. With
 *  one, the bill itself must be uploaded (the server enforces the same rule).
 *  Messages are copy, so the translator comes in with it. */
export const buildCompleteSchema = (hasVenue: boolean, t: Translate) =>
  z
    .object({
      host_user_id: z.string().trim().min(1, t('admin.completePod.selectHost')),
      venue_bill_amount: z.coerce
        .number({ message: t('admin.completePod.invalidAmount') })
        .min(0, t('admin.completePod.invalidAmount')),
      venue_bill_media: z.string(),
      include_slot_price: z.boolean(),
      media_text: z.string().trim().min(1, t('admin.completePod.mediaRequired')),
      notes: z.string().trim().max(1000, t('admin.completePod.notesTooLong')),
    })
    .superRefine((values, ctx) => {
      if (hasVenue && values.venue_bill_amount > 0 && !firstMediaUrl(values.venue_bill_media)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['venue_bill_media'],
          message: t('shell.venueBill.uploadRequired'),
        });
      }
    });

/** Maps validated values onto the server's CompletePodInput. The bill's file
 *  and the slot-price choice ride only with an amount. */
export function buildCompleteInput(values: CompletePodValues, podId: string) {
  const billAmount = Number(values.venue_bill_amount) || 0;
  return {
    pod_id: podId,
    host_user_id: values.host_user_id || undefined,
    venue_bill_amount: billAmount,
    venue_bill_url: billAmount > 0 ? firstMediaUrl(values.venue_bill_media) : undefined,
    include_slot_price: billAmount > 0 ? values.include_slot_price : undefined,
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
  const hasVenue = !!pod?.venue_id;
  const hostIds = (pod?.pod_hosts_id ?? []) as string[];
  const hostOptions = hostIds.map((id) => users.find((user) => user.user_id === id) ?? { user_id: id, full_name: id });
  const initialValues: CompletePodValues = {
    host_user_id: hostOptions[0]?.user_id ?? '',
    venue_bill_amount: 0,
    venue_bill_media: '',
    include_slot_price: false,
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
  const includeSlotPrice = venueBillAmount > 0 && watch('include_slot_price');
  const selectedHostId = watch('host_user_id') || '';

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
              {hasVenue && <VenueBillFields control={control} billAmount={venueBillAmount} />}
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
                  includeSlotPrice={includeSlotPrice}
                  hostUserId={selectedHostId}
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
