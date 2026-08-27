import { useState } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** Loading flag from the parent mutation. */
  loading?: boolean;
  /** Server error surfaced after a failed reopen (e.g. window passed). */
  error?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * Captures an OPTIONAL reason before re-opening a resolved/closed ticket or
 * chat (B11 — reason is optional everywhere). Reused by both TicketDetailPage
 * and the chat header flow.
 */
export default function ReopenReasonDialog({ open, loading, error, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const submit = () => onSubmit(reason.trim());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.supportChat.reOpenThisConversation')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          Tell us why you need to re-open this — it helps our team pick up where you left off. (optional)
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t('mweb.common.reasonOptional')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          slotProps={{
            htmlInput: { maxLength: 500 }
          }}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('mweb.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" disabled={loading} onClick={submit}>
          {loading ? 'Re-opening…' : 'Re-open'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
