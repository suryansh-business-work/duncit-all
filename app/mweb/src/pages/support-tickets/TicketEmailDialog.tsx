import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { EMAIL_TICKET_TRANSCRIPT } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  ticketId: string;
  defaultEmail?: string;
  onClose: () => void;
}

/** Email a ticket transcript to an address (B15) — server defaults to .docx. */
export default function TicketEmailDialog({ open, ticketId, defaultEmail, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [send, { loading }] = useMutation(EMAIL_TICKET_TRANSCRIPT);

  const handleSend = async () => {
    setError(null);
    try {
      await send({ variables: { ticket_id: ticketId, email: email.trim() } });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('mweb.supportTickets.couldNotEmailTheTranscript'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.supportTickets.emailThisTicket')}</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert severity="success">Transcript sent to {email}.</Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              size="small"
              type="email"
              label={t('mweb.common.emailAddress')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mt: 1 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{done ? 'Done' : 'Cancel'}</Button>
        {!done && (
          <Button variant="contained" disabled={loading || !email.trim()} onClick={handleSend}>
            {loading ? 'Sending…' : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
