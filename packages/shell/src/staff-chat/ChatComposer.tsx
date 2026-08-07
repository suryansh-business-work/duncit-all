import { useRef, useState } from 'react';
import { Box, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker from './EmojiPicker';
import ComposerMenu from './ComposerMenu';

interface Props {
  sending: boolean;
  uploading: boolean;
  /** False puts Enter on a new line and Ctrl/Cmd+Enter on send. */
  enterToSend: boolean;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  onTyping: () => void;
  /** Share a place, from the menu beside the box. */
  onShareLocation: () => void;
}

/**
 * The box you write in.
 *
 * Sticky to the bottom of the panel, grows with what you type up to a ceiling,
 * and takes a file dropped anywhere on it — the three things that make a chat
 * feel like a chat rather than a form.
 */
export default function ChatComposer({
  sending,
  uploading,
  enterToSend,
  onSend,
  onAttach,
  onTyping,
  onShareLocation,
}: Readonly<Props>) {
  const [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft('');
  };

  /** Enter sends, or Ctrl/Cmd+Enter does — whichever this person chose. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const withModifier = event.ctrlKey || event.metaKey;
    const shouldSend = enterToSend ? event.key === 'Enter' && !event.shiftKey : event.key === 'Enter' && withModifier;
    if (shouldSend) {
      event.preventDefault();
      send();
    }
  };

  return (
    <Box
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onAttach(file);
      }}
      sx={{
        p: 1,
        borderTop: 1,
        borderColor: 'divider',
        // Sticky, so a long thread never scrolls the box you type in away.
        // (Sticky is also positioned, which the drop hint below relies on.)
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.paper',
        outline: dragging ? '2px dashed' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: -4,
      }}
    >
      {dragging && (
        <Typography
          variant="caption"
          color="primary"
          sx={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center' }}
        >
          Drop to attach
        </Typography>
      )}

      {/* Centred, not bottom-aligned: on a one-line box — which is almost
          always — bottom alignment drops the icons a few pixels below the text
          and the whole row reads as crooked. */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Tooltip title="Attach a file">
          <IconButton
            size="small"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Attach a file"
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {/* Any file, not only images — a chat where you cannot send a PDF is a
            chat people leave to send the PDF. */}
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAttach(file);
            event.target.value = '';
          }}
        />

        <EmojiPicker disabled={sending} onPick={(emoji) => setDraft((text) => text + emoji)} />
        <ComposerMenu onShareLocation={onShareLocation} />

        <TextField
          fullWidth
          size="small"
          multiline
          // Grows with the message, then scrolls — a composer that can eat the
          // whole panel is a composer that hides the conversation.
          maxRows={6}
          placeholder="Write a message"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping();
          }}
          onKeyDown={onKeyDown}
          inputProps={{ 'aria-label': 'Write a message' }}
        />

        <IconButton
          color="primary"
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label="Send message"
        >
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}
