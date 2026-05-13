import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import { Form, Formik, type FormikErrors, type FormikTouched } from 'formik';
import DraggableDialogPaper from './DraggableDialogPaper';
import { RECORD_USER_CONTACT_ACTION, START_RECORDED_USER_CALL } from './queries';
import {
  CALL_STATUSES,
  EMAIL_STATUSES,
  buildContactActionSchema,
  contactActionInitialValues,
  toRecordContactInput,
  type ContactActionValues,
  type ContactType,
} from './contact-action.form';

interface Props {
  open: boolean;
  type: ContactType;
  user: any;
  onClose: () => void;
  onSaved: () => void;
}

function shouldShowError(
  values: ContactActionValues,
  errors: FormikErrors<ContactActionValues>,
  touched: FormikTouched<ContactActionValues>,
  submitCount: number,
  key: keyof ContactActionValues,
) {
  const value = values[key];
  const hasValue = typeof value === 'number' ? value > 0 : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}

export default function ContactActionDialog({ open, type, user, onClose, onSaved }: Props) {
  const [recordAction] = useMutation(RECORD_USER_CONTACT_ACTION);
  const [startRecordedCall] = useMutation(START_RECORDED_USER_CALL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => {
    if (type === 'CALL') return `${user.phone_extension || ''}${user.phone_number || ''}`.trim();
    return user.email || '';
  }, [type, user]);

  const schema = useMemo(() => buildContactActionSchema(type), [type]);
  const statusOptions = type === 'CALL' ? CALL_STATUSES : EMAIL_STATUSES;

  const openNativeAction = (subject: string) => {
    if (!target) return;
    const url =
      type === 'CALL'
        ? `tel:${target}`
        : `mailto:${target}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    window.open(url, '_self');
  };

  const startRecorded = async (notes: string) => {
    setBusy(true);
    setError(null);
    try {
      await startRecordedCall({ variables: { input: { user_id: user.user_id, target, notes } } });
      onSaved();
      onClose();
    } catch (callError: any) {
      setError(callError.message || 'Failed to start recorded call');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      PaperComponent={DraggableDialogPaper}
      fullWidth
      maxWidth="sm"
    >
      <Formik<ContactActionValues>
        initialValues={contactActionInitialValues}
        enableReinitialize
        validationSchema={schema}
        validateOnBlur
        validateOnChange
        onSubmit={async (values) => {
          if (!target) {
            setError('Contact target missing');
            return;
          }
          setBusy(true);
          setError(null);
          try {
            const input = toRecordContactInput(values, user.user_id, type, target);
            await recordAction({ variables: { input } });
            onSaved();
            onClose();
          } catch (saveError: any) {
            setError(saveError?.message || 'Failed to save contact log');
          } finally {
            setBusy(false);
          }
        }}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue, submitForm }) => {
          const err = (key: keyof ContactActionValues) =>
            shouldShowError(values, errors, touched, submitCount, key);
          const help = (key: keyof ContactActionValues, fallback = ' ') =>
            err(key) ? String(errors[key]) : fallback;
          return (
            <Form noValidate>
              <DialogTitle data-dialog-drag-handle="true" sx={{ cursor: 'move' }}>
                {type === 'CALL' ? 'Call User' : 'Email User'}
              </DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <Typography variant="body2" color="text.secondary">
                    {user.full_name || user.email || user.user_id}
                  </Typography>
                  <TextField
                    label={type === 'CALL' ? 'Phone' : 'Email'}
                    value={target}
                    disabled
                    fullWidth
                    helperText={target ? ' ' : 'No target available for this contact action.'}
                  />
                  {type === 'EMAIL' && (
                    <TextField
                      label="Subject"
                      name="subject"
                      value={values.subject}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={err('subject')}
                      helperText={help('subject')}
                      fullWidth
                    />
                  )}
                  <TextField
                    select
                    label="Status"
                    name="status"
                    value={values.status}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={err('status')}
                    helperText={help('status')}
                    fullWidth
                    required
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                  {type === 'CALL' && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Duration seconds"
                        type="number"
                        name="duration_seconds"
                        value={values.duration_seconds}
                        onChange={(event) => {
                          const raw = event.target.value;
                          setFieldValue('duration_seconds', raw === '' ? 0 : Number(raw));
                        }}
                        onBlur={handleBlur}
                        error={err('duration_seconds')}
                        helperText={help('duration_seconds')}
                        fullWidth
                        inputProps={{ min: 0, step: 1 }}
                      />
                      <TextField
                        label="Recording URL"
                        name="recording_url"
                        value={values.recording_url}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={err('recording_url')}
                        helperText={help('recording_url')}
                        fullWidth
                      />
                    </Stack>
                  )}
                  <TextField
                    label="Notes"
                    name="notes"
                    value={values.notes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={err('notes')}
                    helperText={help('notes')}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                {type === 'CALL' && (
                  <Button
                    onClick={() => startRecorded(values.notes)}
                    startIcon={<CallIcon />}
                    disabled={busy || !target}
                  >
                    Start Recorded Call
                  </Button>
                )}
                <Button
                  onClick={() => openNativeAction(values.subject)}
                  startIcon={type === 'CALL' ? <CallIcon /> : <EmailIcon />}
                  disabled={!target}
                >
                  {type === 'CALL' ? 'Open Dialer' : 'Open Email'}
                </Button>
                <Button onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={submitForm} disabled={busy || !target}>
                  {busy ? 'Saving…' : 'Save Log'}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
