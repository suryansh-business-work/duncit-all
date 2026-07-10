import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Button, Chip, CircularProgress, IconButton, Stack, TextField } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import { UPLOAD_ATTACHMENT } from './queries';
import { isVideoUpload } from '../../utils/attachment';

const MAX_BYTES = 100 * 1024 * 1024; // Images & documents up to 100 MB.
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // Videos are capped tighter at 50 MB.
const ACCEPT = 'image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx';

interface Props {
  disabled?: boolean;
  onSend: (text: string, attachments: string[]) => void;
  onTyping: () => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

export default function ChatComposer({ disabled, onSend, onTyping }: Readonly<Props>) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, { loading: uploading }] = useMutation(UPLOAD_ATTACHMENT);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const lastTyping = useRef(0);

  const handleTyping = (value: string) => {
    setText(value);
    const now = Date.now();
    if (now - lastTyping.current > 1500) {
      lastTyping.current = now;
      onTyping();
    }
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isVideoUpload(file.name, file.type) && file.size > VIDEO_MAX_BYTES) {
      setError('Video is too large (max 50 MB)');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 100 MB)');
      return;
    }
    setError(null);
    try {
      const fileBase64 = await readAsDataUrl(file);
      const res = await uploadFile({
        variables: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          folder: '/support-chat',
          allow_documents: true,
        },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (url) setAttachments((prev) => [...prev, url].slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body && attachments.length === 0) return;
    onSend(body, attachments);
    setText('');
    setAttachments([]);
  };

  return (
    <Stack spacing={0.75}>
      {error && (
        <Chip size="small" color="error" label={error} onDelete={() => setError(null)} sx={{ alignSelf: 'flex-start' }} />
      )}
      {attachments.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {attachments.map((url, i) => (
            <Chip
              key={url}
              size="small"
              label={`Attachment ${i + 1}`}
              onDelete={() => setAttachments(attachments.filter((u) => u !== url))}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={pickFile} />
        <IconButton
          aria-label="Attach file"
          disabled={disabled || uploading || attachments.length >= 5}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <CircularProgress size={20} /> : <AttachFileIcon />}
        </IconButton>
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message…"
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Box>
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            onClick={send}
          >
            Send
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
