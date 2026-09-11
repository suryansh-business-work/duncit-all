import { useState } from 'react';
import { Box, Paper, Stack, TextField, Typography } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import AttachmentsField from '../../../forms/support-form/AttachmentsField';
import { useTranslation } from '../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../theme';
import { PILL_FIELD_SX, SEND_BUTTON_SX } from '../../support-chat/calmStyles';

interface Props {
  /** Resolved/closed tickets lock the reply box (B7). */
  locked: boolean;
  busy: boolean;
  onSend: (message: string, attachments: string[]) => void;
}

/** Reply composer for a ticket; read-only once the ticket is resolved/closed. */
export default function TicketComposer({ locked, busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  if (locked) {
    return (
      <Box sx={{ p: 1.5, borderRadius: '18px', textAlign: 'center', bgcolor: 'action.hover' }}>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          This conversation has been marked as resolved.
        </Typography>
      </Box>
    );
  }

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    onSend(message.trim(), attachments);
    setMessage('');
    setAttachments([]);
  };

  return (
    <Paper sx={{ ...SURFACE_SX, p: 1.5 }}>
      <Stack spacing={1}>
        <AttachmentsField attachments={attachments} setAttachments={setAttachments} />
        <Stack direction="row" spacing={1} sx={{
          alignItems: "flex-end"
        }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('mweb.common.writeAReply')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            maxRows={4}
            sx={PILL_FIELD_SX}
          />
          <DuncitRoundButton
            size="large"
            aria-label={t('mweb.ticketDetails.sendReply')}
            disabled={busy || (!message.trim() && attachments.length === 0)}
            onClick={handleSend}
            sx={SEND_BUTTON_SX}
          >
            <SendRoundedIcon />
          </DuncitRoundButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
