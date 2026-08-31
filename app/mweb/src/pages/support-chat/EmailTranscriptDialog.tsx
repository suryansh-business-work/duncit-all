import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { EMAIL_SUPPORT_CHAT_TRANSCRIPT } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  sessionId: string;
  defaultEmail?: string;
  onClose: () => void;
}

export default function EmailTranscriptDialog({ open, sessionId, defaultEmail, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [send, { loading }] = useMutation<any>(EMAIL_SUPPORT_CHAT_TRANSCRIPT);

  const handleSend = async () => {
    setError(null);
    try {
      await send({ variables: { session_id: sessionId, email: email.trim() } });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not email the transcript.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.supportChat.emailThisChat')}</DialogTitle>
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
        <DuncitButton onClick={onClose}>{done ? 'Done' : 'Cancel'}</DuncitButton>
        {!done && (
          <DuncitButton variant="contained" disabled={loading || !email.trim()} onClick={handleSend}>
            {loading ? 'Sending…' : 'Send'}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
