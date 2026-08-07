import { useRef } from 'react';
import { IconButton, Stack, TextField, Tooltip } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker from './EmojiPicker';
import ComposerMenu from './ComposerMenu';

interface Props {
  draft: string;
  sending: boolean;
  uploading: boolean;
  /** The textarea, so the mention popup can read and move the caret. */
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onDraft: (value: string, caret: number) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onBlur: () => void;
  onSend: () => void;
  onAttach: (file: File) => void;
  onRecord: () => void;
  onShareLocation: () => void;
}

/**
 * The row of controls around the box you type in.
 *
 * Centred, not bottom-aligned: on a one-line box — which is almost always —
 * bottom alignment drops the icons a few pixels below the text and the whole
 * row reads as crooked.
 */
export default function ComposerRow({
  draft,
  sending,
  uploading,
  inputRef,
  onDraft,
  onKeyDown,
  onBlur,
  onSend,
  onAttach,
  onRecord,
  onShareLocation,
}: Readonly<Props>) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasText = Boolean(draft.trim());

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Tooltip title="Attach a file">
        <span>
          <IconButton
            size="small"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Attach a file"
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
        </span>
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

      <EmojiPicker
        disabled={sending}
        onPick={(emoji) => onDraft(draft + emoji, draft.length + emoji.length)}
      />
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
        inputRef={inputRef}
        onChange={(event) =>
          onDraft(event.target.value, event.target.selectionStart ?? event.target.value.length)
        }
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        inputProps={{ 'aria-label': 'Write a message' }}
      />

      {/* Mic when there is nothing to send, send when there is — the same swap
          every messenger makes, because the two are never both wanted. */}
      <Tooltip title={hasText ? 'Send' : 'Record a voice note'}>
        <span>
          <IconButton
            color="primary"
            onClick={hasText ? onSend : onRecord}
            disabled={sending || (!hasText && uploading)}
            aria-label={hasText ? 'Send message' : 'Record a voice note'}
          >
            {hasText ? <SendIcon /> : <MicIcon />}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
