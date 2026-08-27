import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

const MAX_REASON = 500; // WalletWithdrawal.reject_reason maxlength

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Give the withdrawer at least a short reason (5 characters).')
    .max(MAX_REASON, `Keep the reason under ${MAX_REASON} characters.`),
});

export type RejectFormValues = z.infer<typeof rejectSchema>;

interface Props {
  /** The withdrawer being rejected; `null` closes the dialog. */
  target: { id: string; name: string } | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (id: string, reason: string) => void;
}

/**
 * Rejecting is the only review action that needs input: the amount was debited
 * when the request was raised, so a rejection credits it back and the reason is
 * what the withdrawer reads in their wallet history.
 */
export default function RejectWithdrawalDialog({
  target,
  busy,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
    mode: 'onSubmit',
  });

  // A fresh target must never inherit the previous rejection's reason.
  useEffect(() => {
    if (target) reset({ reason: '' });
  }, [target, reset]);

  const submit = handleSubmit((values) => {
    if (target) onSubmit(target.id, values.reason);
  });

  return (
    <Dialog open={!!target} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('finance.withdrawals.rejectWithdrawal')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Rejecting credits {target?.name}&apos;s wallet back. The request stays in the history
          with this reason.
        </Typography>
        <TextField
          label={t('finance.common.reason')}
          required
          multiline
          minRows={2}
          fullWidth
          autoFocus
          error={!!errors.reason}
          helperText={errors.reason?.message ?? 'Shown to the withdrawer.'}
          {...register('reason')}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          Cancel
        </DuncitButton>
        <DuncitButton color="error" variant="contained" disabled={busy} onClick={submit}>
          Reject &amp; refund
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
