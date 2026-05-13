import { useEffect, useState } from 'react';
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
import { Form, Formik } from 'formik';
import { SEND_TEST } from './queries';
import { emailTemplateTestSchema } from './email-template-test';

interface Props {
  open: boolean;
  templateId: string | null;
  varsJson: string;
  onClose: () => void;
  onResult: (kind: 'success' | 'error', msg: string) => void;
}

interface SendTestValues {
  to: string;
}

export default function SendTestDialog({
  open,
  templateId,
  varsJson,
  onClose,
  onResult,
}: Props) {
  const [sendTest, { loading }] = useMutation(SEND_TEST);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) setErrorMsg(null);
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <Formik<SendTestValues>
        initialValues={{ to: '' }}
        validationSchema={emailTemplateTestSchema}
        validateOnChange
        validateOnBlur
        onSubmit={async (values) => {
          if (!templateId) return;
          setErrorMsg(null);
          try {
            const res = await sendTest({
              variables: { id: templateId, to: values.to, vars: varsJson },
            });
            const r = res.data?.sendTestEmail;
            const message = r?.message || (r?.ok ? 'Sent' : 'Failed');
            onResult(r?.ok ? 'success' : 'error', message);
            if (r?.ok) onClose();
            else setErrorMsg(message);
          } catch (err: any) {
            const message = err?.message ?? 'Failed to send test email';
            onResult('error', message);
            setErrorMsg(message);
          }
        }}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, submitForm }) => {
          const showErr = (errors.to && (touched.to || submitCount > 0 || values.to.length > 0)) || false;
          return (
            <Form noValidate>
              <DialogTitle>Send test email</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  fullWidth
                  margin="normal"
                  type="email"
                  label="To"
                  name="to"
                  value={values.to}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(showErr)}
                  helperText={showErr ? errors.to : ' '}
                  disabled={loading}
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
                  variant="contained"
                  disabled={!templateId || loading || !values.to || !!errors.to}
                  onClick={submitForm}
                  startIcon={loading ? <CircularProgress size={16} /> : undefined}
                >
                  {loading ? 'Sending…' : 'Send'}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
