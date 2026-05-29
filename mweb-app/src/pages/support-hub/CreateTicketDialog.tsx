import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import AttachmentsField from '../../forms/support-form/AttachmentsField';
import { CREATE_TICKET, type TicketCategory } from '../support-tickets/queries';

const CATEGORIES: TicketCategory[] = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id?: string) => void;
}

export default function CreateTicketDialog({ open, onClose, onCreated }: Props) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [createTicket, { loading }] = useMutation(CREATE_TICKET);

  const reset = () => {
    setSubject('');
    setCategory('GENERAL');
    setMessage('');
    setAttachments([]);
  };

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return;
    const res = await createTicket({
      variables: {
        input: { subject: subject.trim(), category, body_text: message.trim(), attachments },
      },
    });
    reset();
    onClose();
    onCreated(res.data?.createTicket?.id);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Ticket</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            fullWidth
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Describe the issue"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={4}
          />
          <AttachmentsField attachments={attachments} setAttachments={setAttachments} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={loading || !subject.trim() || !message.trim()}
          onClick={submit}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
