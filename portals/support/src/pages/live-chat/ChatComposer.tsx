import { useRef } from 'react';
import { Button, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { AttachmentUploadField, ATTACHMENT_ACCEPT_ALL } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';

interface Props {
  text: string;
  attachments: string[];
  sending: boolean;
  onText: (v: string) => void;
  onAttachments: (v: string[]) => void;
  onSend: () => void;
  onTyping?: () => void;
}

/** Message composer — text + image attachments + send (Enter submits). Signals
 * typing (throttled) so the user sees the "Support is typing…" indicator. */
export default function ChatComposer({ text, attachments, sending, onText, onAttachments, onSend, onTyping }: Readonly<Props>) {
  const { t } = useTranslation();
  const lastTyping = useRef(0);
  const handleChange = (value: string) => {
    onText(value);
    const now = Date.now();
    if (onTyping && now - lastTyping.current > 1500) {
      lastTyping.current = now;
      onTyping();
    }
  };
  return (
    <Stack spacing={1} sx={{ p: 1.5 }}>
      <AttachmentUploadField
        value={attachments}
        onChange={onAttachments}
        folder="/support/chat"
        label={t('support.chat.attach')}
        max={3}
        accept={ATTACHMENT_ACCEPT_ALL}
        maxBytes={100 * 1024 * 1024}
        allowDocuments
      />
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('support.chat.placeholder')}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button
          variant="contained"
          endIcon={<SendIcon />}
          disabled={sending || (!text.trim() && attachments.length === 0)}
          onClick={onSend}
        >
          Send
        </Button>
      </Stack>
    </Stack>
  );
}
