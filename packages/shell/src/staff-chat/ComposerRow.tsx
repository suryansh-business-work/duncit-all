import { useRef } from 'react';
import { Stack, TextField, Tooltip } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import EmojiPicker from './EmojiPicker';
import { useTranslation } from '../i18n/useTranslation';
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
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasText = Boolean(draft.trim());

  return (
    <Stack direction="row" spacing={0.5} sx={{
      alignItems: "center"
    }}>
      <Tooltip title={t('shell.chat.composer.attach')}>
        <span>
          <DuncitIconButton
            size="small"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t('shell.chat.composer.attach')}
          >
            <AttachFileIcon fontSize="small" />
          </DuncitIconButton>
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
        placeholder={t('shell.chat.composer.placeholder')}
        value={draft}
        inputRef={inputRef}
        onChange={(event) =>
          onDraft(event.target.value, event.target.selectionStart ?? event.target.value.length)
        }
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        slotProps={{
          htmlInput: { 'aria-label': t('shell.chat.composer.placeholder') }
        }}
      />

      {/* Mic when there is nothing to send, send when there is — the same swap
          every messenger makes, because the two are never both wanted. */}
      <Tooltip title={hasText ? t('shell.chat.composer.send') : t('shell.chat.composer.recordVoice')}>
        <span>
          <DuncitIconButton
            color="primary"
            onClick={hasText ? onSend : onRecord}
            disabled={sending || (!hasText && uploading)}
            aria-label={hasText ? t('shell.chat.composer.sendMessage') : t('shell.chat.composer.recordVoice')}
          >
            {hasText ? <SendIcon /> : <MicIcon />}
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
