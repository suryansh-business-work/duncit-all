import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
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
  attachments?: string[];
  status: string;
  created_at: string;
}

interface Props {
  submission: Submission | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;

export default function ContactDetailsDialog({ submission, onClose, onUpdateStatus }: Readonly<Props>) {
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
          {submission.attachments && submission.attachments.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Attachments ({submission.attachments.length})
              </Typography>
              <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
                {submission.attachments.map((url, i) => (
                  <Link
                    key={url + i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'block', width: 96, height: 96, borderRadius: 1, overflow: 'hidden' }}
                  >
                    <Box
                      component="img"
                      src={url}
                      alt={`attachment-${i + 1}`}
                      loading="lazy"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Link>
                ))}
              </Stack>
            </Box>
          )}
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
