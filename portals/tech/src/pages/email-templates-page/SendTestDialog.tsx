import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { SEND_TEST } from './queries';
import { emailTemplateTestSchema, type EmailTemplateTestValues } from './email-template-test';

interface Props {
  open: boolean;
  templateId: string | null;
  varsJson: string;
  onClose: () => void;
  onResult: (kind: 'success' | 'error', msg: string) => void;
}

export default function SendTestDialog({
  open,
  templateId,
  varsJson,
  onClose,
  onResult,
}: Readonly<Props>) {
  const [sendTest, { loading }] = useMutation(SEND_TEST);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { control, handleSubmit, watch, reset, formState } = useForm<EmailTemplateTestValues>({
    defaultValues: { to: '' },
    resolver: zodResolver(emailTemplateTestSchema),
    mode: 'onChange',
  });
  const to = watch('to');

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      reset({ to: '' });
    }
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    if (!templateId) return;
    setErrorMsg(null);
    try {
      const res = await sendTest({
        variables: { id: templateId, to: values.to, vars: varsJson },
      });
      const r = res.data?.sendTestEmail;
      const message = r?.message || (r?.ok ? 'Sent' : 'Failed');
      onResult(r?.ok ? 'success' : 'error', message);
      if (r?.ok) {
        onClose();
      } else {
        setErrorMsg(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send test email';
      onResult('error', message);
      setErrorMsg(message);
    }
  });

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <form noValidate onSubmit={submit}>
        <DialogTitle>Send test email</DialogTitle>
        <DialogContent>
          <Controller
            control={control}
            name="to"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoFocus
                fullWidth
                required
                margin="normal"
                type="email"
                label="To"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                disabled={loading}
              />
            )}
          />
          <Typography variant="caption" color="text.secondary">
            Uses the sample JSON from the Variables tab.
          </Typography>
          {errorMsg && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              {errorMsg}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!templateId || loading || !to || !!formState.errors.to}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
