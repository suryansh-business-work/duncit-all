import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { REASON_MAX, makeVoidCardSchema, type VoidCardFormProps, type VoidCardValues } from './void-card.types';

const TITLE_ID = 'void-card-title';
const BODY_ID = 'void-card-body';

/** Asks for the reason before a card is cancelled for good. */
export default function VoidCardForm({ open, busy, errorMessage, onCancel, onSubmit }: Readonly<VoidCardFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVoidCardSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<VoidCardValues>({
    defaultValues: { reason: '' },
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  // Every opening starts clean — a reason typed for another card must not carry over.
  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} aria-labelledby={TITLE_ID} aria-describedby={BODY_ID} fullWidth maxWidth="sm">
      <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="void-card-form">
        <DialogTitle id={TITLE_ID}>{t('loyalty.physical.voidTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText id={BODY_ID}>{t('loyalty.physical.voidBody')}</DialogContentText>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <RhfTextField
              control={control}
              name="reason"
              label={t('loyalty.physical.voidReasonLabel')}
              required
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: REASON_MAX } }}
              data-testid="void-card-reason"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('loyalty.physical.voidKeep')}
          </DuncitButton>
          <DuncitButton type="submit" color="error" variant="contained" loading={busy} data-testid="void-card-confirm">
            {t('loyalty.physical.voidConfirm')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
