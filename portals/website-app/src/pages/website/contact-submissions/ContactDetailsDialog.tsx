import { useEffect, useState } from 'react';
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
import { useDateFormat } from '../../../utils/dateFormat';
import { CONTACT_STATUSES, type ContactStatus, type ContactSubmission } from './queries';

interface Props {
  submission: ContactSubmission | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ContactStatus) => void;
}

export default function ContactDetailsDialog({ submission, onClose, onUpdateStatus }: Readonly<Props>) {
  const { formatDateTime } = useDateFormat();
  const [status, setStatus] = useState<ContactStatus>('NEW');

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
            From <b>{submission.name}</b> ({submission.email}) · {formatDateTime(submission.created_at)}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{submission.message}</Typography>
          {submission.attachments?.length > 0 && (
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
            onChange={(e) => setStatus(e.target.value as ContactStatus)}
          >
            {CONTACT_STATUSES.map((s) => (
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
