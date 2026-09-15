import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
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
  const [send, { loading }] = useMutation<any>(EMAIL_TICKET_TRANSCRIPT);

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
    <Dialog data-testid="support-email-modal" open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 600 }}>{t('mweb.supportTickets.emailThisTicket')}</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert data-testid="email-done" severity="success">Transcript sent to {email}.</Alert>
        ) : (
          <>
            {error && (
              <Alert data-testid="email-error" severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the dialog the user just opened (WCAG 2.4.3)
              autoFocus
              fullWidth
              size="small"
              type="email"
              autoComplete="email"
              data-testid="email-field"
              label={t('mweb.common.emailAddress')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mt: 1 }}
              slotProps={{ htmlInput: { 'data-testid': 'email-input' } }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="email-close" onClick={onClose}>{done ? 'Done' : 'Cancel'}</DuncitButton>
        {!done && (
          <DuncitButton data-testid="email-send" variant="contained" disabled={loading || !email.trim()} onClick={handleSend}>
            {loading ? 'Sending…' : 'Send'}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
