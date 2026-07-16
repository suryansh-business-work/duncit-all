import { useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RichTextEditor, { htmlToText } from '../../../components/RichTextEditor';
import { AttachmentUploadField, ATTACHMENT_ACCEPT_ALL } from '@duncit/media-picker';
import { ConfirmDialog } from '@duncit/dialogs';
import type { TicketStatus } from '../../../graphql/tickets';

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
  const [confirmClose, setConfirmClose] = useState(false);

  if (status === 'CLOSED') {
    return (
      <Alert severity="info" icon={<LockOutlinedIcon fontSize="inherit" />}>
        This ticket is closed and read-only. The user can reopen it within the allowed window.
      </Alert>
    );
  }

  if (status === 'RESOLVED') {
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 1.5 }}>
          This ticket is resolved. Close it once the user has confirmed, or it will reopen
          automatically if they reply within the allowed window.
        </Alert>
        <Button variant="contained" color="error" fullWidth size="large" onClick={() => setConfirmClose(true)}>
          Close
        </Button>
        <ConfirmDialog
          open={confirmClose}
          title="Close this support ticket?"
          message="Are you sure you want to close this support ticket? It will become permanently read-only — the user can reopen it within the allowed window."
          confirmLabel="Close ticket"
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
    <Box>
      <RichTextEditor value={bodyHtml} onChange={onBodyHtml} placeholder="Write a reply…" minHeight={110} />
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mt: 1 }} spacing={1}>
        <AttachmentUploadField
          value={attachments}
          onChange={onAttachments}
          folder="/support/tickets"
          label="Attach"
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
