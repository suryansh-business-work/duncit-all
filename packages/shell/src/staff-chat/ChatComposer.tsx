import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import VoiceRecorderBar from './voice/VoiceRecorderBar';
import { useVoiceNote } from './voice/useVoiceNote';
import { useTranslation } from '../i18n/useTranslation';
import ComposerRow from './ComposerRow';
import SuggestionPopup from './SuggestionPopup';
import { useComposerSuggestions } from './useComposerSuggestions';

interface Props {
  sending: boolean;
  uploading: boolean;
  /** Who can be mentioned here — the other person, in a one-to-one thread. */
  mentionNames: string[];
  /** False puts Enter on a new line and Ctrl/Cmd+Enter on send. */
  enterToSend: boolean;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  /** A finished voice note, with the waveform sampled while it recorded. */
  onVoiceNote: (file: File, peaks: number[], seconds: number) => void;
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
  mentionNames,
  enterToSend,
  onSend,
  onAttach,
  onVoiceNote,
  onTyping,
  onShareLocation,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const voice = useVoiceNote();
  const [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /** Move the caret after React has written the new value, not before. */
  const writeDraft = (text: string, caret: number) => {
    setDraft(text);
    globalThis.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  const suggestions = useComposerSuggestions({ mentionNames, draft, onDraft: writeDraft });
  const caretNow = () => inputRef.current?.selectionStart ?? draft.length;

  /** Stop, keep, and post it with the waveform sampled while it recorded. */
  const sendVoiceNote = () => {
    voice
      .stop(true)
      .then((note) => {
        if (!note) return;
        // The duration goes in the NAME because a webm from MediaRecorder
        // carries none in its header — see MessageAttachment.
        const name = `voice-note-${note.seconds}s.webm`;
        onVoiceNote(
          new File([note.blob], name, { type: note.blob.type }),
          note.peaks,
          note.seconds
        );
      })
      .catch(() => undefined);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft('');
    suggestions.close();
  };

  /** Enter sends, or Ctrl/Cmd+Enter does — whichever this person chose. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (suggestions.handleKey(event, caretNow())) return;
    const withModifier = event.ctrlKey || event.metaKey;
    const shouldSend = enterToSend
      ? event.key === 'Enter' && !event.shiftKey
      : event.key === 'Enter' && withModifier;
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
      <SuggestionPopup
        items={suggestions.items}
        active={suggestions.active}
        onPick={(item) => suggestions.pick(item, caretNow())}
      />

      {voice.error && (
        <Typography variant="caption" color="error" sx={{ px: 1 }}>
          {voice.error}
        </Typography>
      )}

      {dragging && (
        <Typography
          variant="caption"
          color="primary"
          sx={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center' }}
        >
          {t('shell.chat.composer.dropToAttach')}
        </Typography>
      )}

      {voice.recording ? (
        <VoiceRecorderBar
          seconds={voice.seconds}
          level={voice.level}
          onCancel={() => voice.stop(false).catch(() => undefined)}
          onSend={sendVoiceNote}
        />
      ) : (
        <ComposerRow
          draft={draft}
          sending={sending}
          uploading={uploading}
          inputRef={inputRef}
          onDraft={(value, caret) => {
            setDraft(value);
            suggestions.read(value, caret);
            onTyping();
          }}
          onKeyDown={onKeyDown}
          onBlur={suggestions.close}
          onSend={send}
          onAttach={onAttach}
          onRecord={() => voice.start().catch(() => undefined)}
          onShareLocation={onShareLocation}
        />
      )}
    </Box>
  );
}
