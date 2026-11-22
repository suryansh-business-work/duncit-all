import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, DialogContentText, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { RENTAL_REFUND_NOTE_MIN } from '@duncit/utils';
import type { Translate } from '../../types';
import type { SendRefundFormProps, SendRefundOutput, SendRefundValues } from './send-refund.types';

const DEFAULTS: SendRefundValues = { note: '' };

/**
 * Finance's reason for sending a refund that waited for review. The server
 * refuses a shorter one (rentalRefund.service.ts); the form says so first.
 */
export function makeSendRefundSchema(t: Translate) {
  return z.object({
    note: z
      .string()
      .trim()
      .min(RENTAL_REFUND_NOTE_MIN, t('venueRentals.sendRefund.noteTooShort', { vars: { min: RENTAL_REFUND_NOTE_MIN } })),
  });
}

/** Finance confirms a Razorpay refund for a rental that waited for review, and says why. */
export default function SendRefundForm({ body, busy, errorMessage, onSubmit, onCancel }: Readonly<SendRefundFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSendRefundSchema(t), [t]);
  const { control, handleSubmit } = useForm<SendRefundValues, unknown, SendRefundOutput>({
    defaultValues: DEFAULTS,
    resolver: zodResolver(schema) as unknown as Resolver<SendRefundValues, unknown, SendRefundOutput>,
  });

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="send-refund-form">
      <Stack spacing={2.5}>
        <DialogContentText data-testid="send-refund-body">{body}</DialogContentText>
        {errorMessage && (
          <Alert severity="error" data-testid="send-refund-error">
            {errorMessage}
          </Alert>
        )}
        <RhfTextField
          control={control}
          name="note"
          label={t('venueRentals.sendRefund.note')}
          hint={t('venueRentals.sendRefund.noteHint')}
          multiline
          minRows={2}
          data-testid="send-refund-note"
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('venueRentals.sendRefund.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="send-refund-save">
            {t('venueRentals.sendRefund.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
