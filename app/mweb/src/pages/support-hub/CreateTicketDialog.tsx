import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import AttachmentsField from '../../forms/support-form/AttachmentsField';
import { CREATE_TICKET, type TicketCategory } from '../support-tickets/queries';
import { useTranslation } from '../../i18n/useTranslation';

const CATEGORIES: TicketCategory[] = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id?: string) => void;
}

export default function CreateTicketDialog({ open, onClose, onCreated }: Readonly<Props>) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [createTicket, { loading }] = useMutation<any>(CREATE_TICKET);

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
      <DialogTitle>{t('mweb.supportHub.newTicket')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label={t('mweb.common.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            select
            label={t('mweb.common.category')}
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
            label={t('mweb.supportHub.describeTheIssue')}
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
        <DuncitButton onClick={onClose}>{t('mweb.common.cancel')}</DuncitButton>
        <DuncitButton
          variant="contained"
          disabled={loading || !subject.trim() || !message.trim()}
          onClick={submit}
        >
          Create
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
