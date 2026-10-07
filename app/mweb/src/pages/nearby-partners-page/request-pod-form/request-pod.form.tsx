import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../../components/ResponsiveDialog';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  POD_REQUEST_NOTE_MAX,
  makePodRequestNoteSchema,
  podRequestNoteDefaults,
  type PodRequestNoteValues,
  type RequestPodDialogProps,
} from './request-pod.types';

const FORM_ID = 'request-pod-form';

/** "Request Pod": an optional note, then send. The server's refusal stays in the dialog. */
export default function RequestPodDialog({ targetName, sending, error, onClose, onSubmit }: Readonly<RequestPodDialogProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestNoteSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<PodRequestNoteValues>({
    defaultValues: podRequestNoteDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const close = () => {
    reset(podRequestNoteDefaults);
    onClose();
  };
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.note)) reset(podRequestNoteDefaults);
  });

  return (
    <ResponsiveDialog
      open={targetName !== null}
      onClose={close}
      title={t('podRequests.requestPod')}
      testId="request-pod-dialog"
      actions={
        <DuncitButton
          type="submit"
          form={FORM_ID}
          variant="contained"
          fullWidth
          loading={sending}
          startIcon={<SendRoundedIcon />}
          data-testid="request-pod-send"
        >
          {t('podRequests.requestPod')}
        </DuncitButton>
      }
    >
      <Stack id={FORM_ID} component="form" noValidate spacing={2} onSubmit={submit} data-testid={FORM_ID}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {targetName}
        </Typography>
        <Controller
          control={control}
          name="note"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={3}
              label={t('podRequests.noteLabel')}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('podRequests.noteHint')}
              slotProps={{ htmlInput: { maxLength: POD_REQUEST_NOTE_MAX } }}
              data-testid="request-pod-note"
            />
          )}
        />
        {error && (
          <Alert severity="error" data-testid="request-pod-error">
            {error}
          </Alert>
        )}
      </Stack>
    </ResponsiveDialog>
  );
}
