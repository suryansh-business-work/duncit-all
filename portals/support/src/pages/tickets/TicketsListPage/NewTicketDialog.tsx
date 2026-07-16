import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
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
import { CREATE_TICKET, type TicketCategory } from '../../../graphql/tickets';
import RichTextEditor, { htmlToText } from '../../../components/RichTextEditor';
import { AttachmentUploadField, ATTACHMENT_ACCEPT_ALL } from '@duncit/media-picker';

const CATEGORIES: TicketCategory[] = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the new ticket id (or null) once creation succeeds. */
  onCreated: (id: string | null) => void;
}

export default function NewTicketDialog({ open, onClose, onCreated }: Readonly<Props>) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [createTicket, { loading: creating }] = useMutation(CREATE_TICKET);

  const reset = () => {
    setSubject('');
    setCategory('GENERAL');
    setBodyHtml('');
    setAttachments([]);
  };

  const submit = async () => {
    const bodyText = htmlToText(bodyHtml);
    if (!subject.trim() || !bodyText) return;
    const res = await createTicket({
      variables: {
        input: { subject: subject.trim(), category, body_html: bodyHtml, body_text: bodyText, attachments },
      },
    });
    reset();
    onCreated(res.data?.createTicket?.id ?? null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Ticket</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth autoFocus />
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
          <Box>
            <Typography variant="caption" color="text.secondary">
              Description
            </Typography>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Describe the issue…" />
          </Box>
          <AttachmentUploadField
            value={attachments}
            onChange={setAttachments}
            folder="/support/tickets"
            accept={ATTACHMENT_ACCEPT_ALL}
            maxBytes={100 * 1024 * 1024}
            allowDocuments
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={creating || !subject.trim() || !htmlToText(bodyHtml)} onClick={submit}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
