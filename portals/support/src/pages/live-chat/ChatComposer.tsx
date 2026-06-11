import { Button, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import UploadField from '../../components/UploadField';

interface Props {
  text: string;
  attachments: string[];
  sending: boolean;
  onText: (v: string) => void;
  onAttachments: (v: string[]) => void;
  onSend: () => void;
}

/** Message composer — text + image attachments + send (Enter submits). */
export default function ChatComposer({ text, attachments, sending, onText, onAttachments, onSend }: Readonly<Props>) {
  return (
    <Stack spacing={1} sx={{ p: 1.5 }}>
      <UploadField value={attachments} onChange={onAttachments} folder="/support/chat" label="Attach" max={3} />
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message…"
          value={text}
          onChange={(e) => onText(e.target.value)}
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
