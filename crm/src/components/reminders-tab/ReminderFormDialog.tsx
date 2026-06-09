import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import {
  CREATE_CRM_REMINDER,
  UPDATE_CRM_REMINDER,
  type CrmReminder,
  type ReminderEntity,
} from '../../api/reminders.gql';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  open: boolean;
  entity: ReminderEntity;
  leadId?: string | null;
  /** Editing an existing reminder, or null to create. */
  reminder: CrmReminder | null;
  onClose: () => void;
  onSaved: () => void;
  refetchQueries?: any[];
}

export default function ReminderFormDialog({ open, entity, leadId, reminder, onClose, onSaved, refetchQueries }: Readonly<Props>) {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createMut, { loading: creating }] = useMutation(CREATE_CRM_REMINDER, { refetchQueries });
  const [updateMut, { loading: updating }] = useMutation(UPDATE_CRM_REMINDER, { refetchQueries });
  const loading = creating || updating;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(reminder?.title ?? '');
    setDueAt(reminder?.due_at ? new Date(reminder.due_at) : new Date());
    setNotes(reminder?.notes ?? '');
  }, [open, reminder]);

  const save = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!dueAt || Number.isNaN(dueAt.getTime())) { setError('Pick a valid due date & time.'); return; }
    setError(null);
    try {
      if (reminder) {
        await updateMut({ variables: { id: reminder.id, input: { title: title.trim(), due_at: dueAt.toISOString(), notes } } });
      } else {
        await createMut({ variables: { input: { entity_type: entity, lead_id: leadId ?? null, title: title.trim(), due_at: dueAt.toISOString(), notes } } });
      }
      onSaved();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{reminder ? 'Edit reminder' : 'New reminder'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus fullWidth />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Due date & time"
              value={dueAt}
              onChange={setDueAt}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </LocalizationProvider>
          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={loading || !title.trim()}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
