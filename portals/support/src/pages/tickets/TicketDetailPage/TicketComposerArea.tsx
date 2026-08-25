import { useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AttachmentUploadField, ATTACHMENT_ACCEPT_ALL } from '@duncit/media-picker';
import { ConfirmDialog } from '@duncit/dialogs';
import { DuncitRichTextInput, htmlToText } from '@duncit/rich-text';
import type { TicketStatus } from '../../../graphql/tickets';
import { useTranslation } from '@duncit/shell';

interface Props {
  status: TicketStatus;
  bodyHtml: string;
  attachments: string[];
  replying: boolean;
  onBodyHtml: (v: string) => void;
  onAttachments: (v: string[]) => void;
  onSend: () => void;
  onClose: () => void;
}

/**
 * The bottom region of a ticket conversation, which depends on status (Item 17):
 *  - OPEN / PENDING → the reply composer (text + attachments + send).
 *  - RESOLVED → no composer; a prominent "Close" button (confirm first).
 *  - CLOSED → permanently read-only; no composer, no Close button.
 */
export default function TicketComposerArea({
  status,
  bodyHtml,
  attachments,
  replying,
  onBodyHtml,
  onAttachments,
  onSend,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirmClose, setConfirmClose] = useState(false);

  if (status === 'CLOSED') {
    return (
      <Alert severity="info" icon={<LockOutlinedIcon fontSize="inherit" />} sx={{ flexShrink: 0 }}>
        This ticket is closed and read-only. The user can reopen it within the allowed window.
      </Alert>
    );
  }

  if (status === 'RESOLVED') {
    return (
      <Box sx={{ flexShrink: 0 }}>
        <Alert severity="success" sx={{ mb: 1.5 }}>
          This ticket is resolved. Close it once the user has confirmed, or it will reopen
          automatically if they reply within the allowed window.
        </Alert>
        <Button variant="contained" color="error" fullWidth size="large" onClick={() => setConfirmClose(true)}>
          Close
        </Button>
        <ConfirmDialog
          open={confirmClose}
          title={t('support.tickets.closeTitle')}
          message={t('support.tickets.closeBody')}
          confirmLabel={t('support.tickets.closeTicket')}
          confirmColor="error"
          titleSx={{ fontWeight: 800 }}
          onConfirm={() => {
            setConfirmClose(false);
            onClose();
          }}
          onClose={() => setConfirmClose(false)}
        />
      </Box>
    );
  }

  return (
    /* The composer never shrinks: whatever height it needs, the thread above it
       keeps the rest. The editor starts short enough to leave the conversation
       room and grows with what is typed, but stops at a cap and scrolls on its
       own — a long reply must not push the conversation off the screen. */
    <Box sx={{ flexShrink: 0, '& .ProseMirror': { maxHeight: 220, overflowY: 'auto' } }}>
      <DuncitRichTextInput value={bodyHtml} onChange={onBodyHtml} minHeight={96} compact aiContext="support ticket reply" />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "flex-end",
          justifyContent: "space-between",
          mt: 1
        }}>
        <AttachmentUploadField
          value={attachments}
          onChange={onAttachments}
          folder="/support/tickets"
          label={t('support.chat.attach')}
          accept={ATTACHMENT_ACCEPT_ALL}
          maxBytes={100 * 1024 * 1024}
          allowDocuments
        />
        <Button variant="contained" endIcon={<SendIcon />} disabled={replying || !htmlToText(bodyHtml)} onClick={onSend}>
          Send
        </Button>
      </Stack>
    </Box>
  );
}
