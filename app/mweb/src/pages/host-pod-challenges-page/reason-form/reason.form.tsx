import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import { buildReasonSchema, type ReasonValues } from './reason.types';

export interface ReasonDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  required: boolean;
  saving: boolean;
  onSubmit: (values: ReasonValues) => Promise<void> | void;
  onClose: () => void;
}

/** A confirmation that also asks why — for score removals and result corrections. */
export function ReasonDialog({ open, title, message, confirmLabel, required, saving, onSubmit, onClose }: Readonly<ReasonDialogProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReasonSchema(t, required), [t, required]);
  const { control, handleSubmit, reset } = useForm<ReasonValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });
  const close = () => {
    reset({ reason: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <form noValidate onSubmit={handleSubmit(async (v) => { await onSubmit(v); reset({ reason: '' }); })}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{message}</DialogContentText>
          <Controller
            name="reason"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={2}
                required={required}
                label={t('mweb.challenge.fields.reason')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={close} disabled={saving}>
            {t('mweb.challenge.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" color="error" disabled={saving}>
            {confirmLabel}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
