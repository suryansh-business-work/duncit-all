import { Alert, Button, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import { useFormikContext } from 'formik';
import type { ContactActionValues, ContactType } from '../contact-action.form';
import { shouldShowContactError } from './contactActionDialogHelpers';

interface Props {
  type: ContactType;
  user: any;
  target: string;
  statusOptions: readonly string[];
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onOpenNativeAction: (subject: string) => void;
  onStartRecorded: (notes: string) => void;
}

export default function ContactActionFormContent({ type, user, target, statusOptions, error, busy, onClose, onOpenNativeAction, onStartRecorded }: Props) {
  const { values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue, submitForm } =
    useFormikContext<ContactActionValues>();
  const showError = (key: keyof ContactActionValues) => shouldShowContactError(values, errors, touched, submitCount, key);
  const helperText = (key: keyof ContactActionValues, fallback = ' ') => (showError(key) ? String(errors[key]) : fallback);

  return (
    <>
      <DialogTitle data-dialog-drag-handle="true" sx={{ cursor: 'move' }}>
        {type === 'CALL' ? 'Call User' : 'Email User'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            {user.full_name || user.email || user.user_id}
          </Typography>
          <TextField label={type === 'CALL' ? 'Phone' : 'Email'} value={target} disabled fullWidth helperText={target ? ' ' : 'No target available for this contact action.'} />
          {type === 'EMAIL' && (
            <TextField label="Subject" name="subject" value={values.subject} onChange={handleChange} onBlur={handleBlur} error={showError('subject')} helperText={helperText('subject')} fullWidth />
          )}
          <TextField select label="Status" name="status" value={values.status} onChange={handleChange} onBlur={handleBlur} error={showError('status')} helperText={helperText('status')} fullWidth required>
            {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </TextField>
          {type === 'CALL' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Duration seconds"
                type="number"
                name="duration_seconds"
                value={values.duration_seconds}
                onChange={(event) => setFieldValue('duration_seconds', event.target.value === '' ? 0 : Number(event.target.value))}
                onBlur={handleBlur}
                error={showError('duration_seconds')}
                helperText={helperText('duration_seconds')}
                fullWidth
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField label="Recording URL" name="recording_url" value={values.recording_url} onChange={handleChange} onBlur={handleBlur} error={showError('recording_url')} helperText={helperText('recording_url')} fullWidth />
            </Stack>
          )}
          <TextField label="Notes" name="notes" value={values.notes} onChange={handleChange} onBlur={handleBlur} error={showError('notes')} helperText={helperText('notes')} multiline minRows={4} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        {type === 'CALL' && <Button onClick={() => onStartRecorded(values.notes)} startIcon={<CallIcon />} disabled={busy || !target}>Start Recorded Call</Button>}
        <Button onClick={() => onOpenNativeAction(values.subject)} startIcon={type === 'CALL' ? <CallIcon /> : <EmailIcon />} disabled={!target}>{type === 'CALL' ? 'Open Dialer' : 'Open Email'}</Button>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submitForm} disabled={busy || !target}>{busy ? 'Saving...' : 'Save Log'}</Button>
      </DialogActions>
    </>
  );
}