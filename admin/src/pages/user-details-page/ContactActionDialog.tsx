import { useEffect, useMemo, useState } from 'react';
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
import DraggableDialogPaper from './DraggableDialogPaper';
import { RECORD_USER_CONTACT_ACTION, START_RECORDED_USER_CALL } from './queries';
import { contactActionSchema } from './contactActionValidation';

type ContactType = 'CALL' | 'EMAIL';

interface Props {
  open: boolean;
  type: ContactType;
  user: any;
  onClose: () => void;
  onSaved: () => void;
}

const statusOptions: Record<ContactType, string[]> = {
  CALL: ['LOGGED', 'CONNECTED', 'MISSED', 'VOICEMAIL'],
  EMAIL: ['LOGGED', 'SENT', 'BOUNCED', 'REPLIED'],
};

export default function ContactActionDialog({ open, type, user, onClose, onSaved }: Props) {
  const [recordAction] = useMutation(RECORD_USER_CONTACT_ACTION);
  const [startRecordedCall] = useMutation(START_RECORDED_USER_CALL);
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('LOGGED');
  const [duration, setDuration] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => {
    if (type === 'CALL') return `${user.phone_extension || ''}${user.phone_number || ''}`.trim();
    return user.email || '';
  }, [type, user]);

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setNotes('');
    setStatus('LOGGED');
    setDuration(0);
    setRecordingUrl('');
    setError(null);
  }, [open, type]);

  const openNativeAction = () => {
    if (!target) return;
    const url = type === 'CALL' ? `tel:${target}` : `mailto:${target}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    window.open(url, '_self');
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        type,
        target,
        subject,
        notes,
        status,
        duration_seconds: Number(duration) || 0,
        recording_url: recordingUrl,
      };
      await contactActionSchema.validate(payload, { abortEarly: false });
      await recordAction({ variables: { input: { user_id: user.user_id, ...payload } } });
      onSaved();
      onClose();
    } catch (saveError: any) {
      setError(saveError?.errors?.join(', ') || saveError.message || 'Failed to save contact log');
    } finally {
      setBusy(false);
    }
  };

  const startRecorded = async () => {
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
    <Dialog open={open} onClose={busy ? undefined : onClose} PaperComponent={DraggableDialogPaper} fullWidth maxWidth="sm">
      <DialogTitle data-dialog-drag-handle="true" sx={{ cursor: 'move' }}>
        {type === 'CALL' ? 'Call User' : 'Email User'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            {user.full_name || user.email || user.user_id}
          </Typography>
          <TextField label={type === 'CALL' ? 'Phone' : 'Email'} value={target} disabled fullWidth />
          {type === 'EMAIL' && (
            <TextField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} fullWidth />
          )}
          <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} fullWidth>
            {statusOptions[type].map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </TextField>
          {type === 'CALL' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Duration seconds"
                type="number"
                value={duration}
                onChange={(event) => setDuration(Math.max(0, Number(event.target.value) || 0))}
                fullWidth
              />
              <TextField
                label="Recording URL"
                value={recordingUrl}
                onChange={(event) => setRecordingUrl(event.target.value)}
                fullWidth
              />
            </Stack>
          )}
          <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={4} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        {type === 'CALL' && (
          <Button onClick={startRecorded} startIcon={<CallIcon />} disabled={busy || !target}>
            Start Recorded Call
          </Button>
        )}
        <Button onClick={openNativeAction} startIcon={type === 'CALL' ? <CallIcon /> : <EmailIcon />} disabled={!target}>
          {type === 'CALL' ? 'Open Dialer' : 'Open Email'}
        </Button>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !target}>{busy ? 'Saving…' : 'Save Log'}</Button>
      </DialogActions>
    </Dialog>
  );
}