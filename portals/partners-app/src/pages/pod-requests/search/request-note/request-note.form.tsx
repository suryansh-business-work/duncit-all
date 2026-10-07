import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import { POD_REQUEST_NOTE_MAX, makePodRequestNoteSchema } from '@duncit/forms/schemas';
import { useTranslation } from '@duncit/shell';
import { requestNoteDefaults, type RequestNoteFormProps, type RequestNoteValues } from './request-note.types';

/** The note a Pod Request travels with, then Send. Lives inside the dialog. */
export default function RequestNoteForm({ targetName, sending, error, onSend, onCancel }: Readonly<RequestNoteFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestNoteSchema(t), [t]);
  const form = useForm<RequestNoteValues>({
    resolver: zodResolver(schema),
    defaultValues: requestNoteDefaults,
    mode: 'onTouched',
  });

  return (
    <form noValidate onSubmit={form.handleSubmit(onSend)}>
      <DialogTitle id="request-pod-title">
        {t('podRequests.requestPod')} · {targetName}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Controller
          name="note"
          control={form.control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label={t('podRequests.noteLabel')}
              placeholder={t('podRequests.noteHint')}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              slotProps={{ htmlInput: { maxLength: POD_REQUEST_NOTE_MAX } }}
              sx={{ mt: 1 }}
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel} disabled={sending}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={sending} endIcon={<SendRoundedIcon />}>
          {t('podRequests.requestPod')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
