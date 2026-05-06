import {
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
import { useEffect, useState } from 'react';

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface Props {
  submission: Submission | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;

export default function ContactDetailsDialog({ submission, onClose, onUpdateStatus }: Props) {
  const [status, setStatus] = useState<string>('NEW');

  useEffect(() => {
    if (submission) setStatus(submission.status);
  }, [submission]);

  if (!submission) return null;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{submission.subject || '(no subject)'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            From <b>{submission.name}</b> ({submission.email}) ·{' '}
            {new Date(submission.created_at).toLocaleString()}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{submission.message}</Typography>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => {
            onUpdateStatus(submission.id, status);
            onClose();
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
