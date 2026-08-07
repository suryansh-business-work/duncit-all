import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import VoiceRecorderBar from './voice/VoiceRecorderBar';
import { useVoiceNote } from './voice/useVoiceNote';
import ComposerRow from './ComposerRow';
import MentionPopup from './MentionPopup';
import { applyMention, mentionQuery } from './mentions';

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
  const voice = useVoiceNote();
  const [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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

  const matches =
    query === null
      ? []
      : mentionNames.filter((name) => name.toLowerCase().startsWith(query.toLowerCase()));

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft('');
    setQuery(null);
  };

  /** Put the chosen name in, and leave the caret after it. */
  const pick = (name: string) => {
    const caret = inputRef.current?.selectionStart ?? draft.length;
    const next = applyMention(draft, caret, name);
    setDraft(next.text);
    setQuery(null);
    // After React has written the new value, or the caret snaps to the end.
    globalThis.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  /** Enter sends, or Ctrl/Cmd+Enter does — whichever this person chose. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    // The mention list owns the arrows and Enter while it is open, or picking
    // somebody would send the half-typed message instead.
    if (matches.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : matches.length - 1;
        setActive((index) => (index + step) % matches.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        pick(matches[active] ?? matches[0]);
        return;
      }
      if (event.key === 'Escape') {
        setQuery(null);
        return;
      }
    }

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
      <MentionPopup names={matches} active={active} onPick={pick} />

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
          Drop to attach
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
            setQuery(mentionQuery(value, caret));
            setActive(0);
            onTyping();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setQuery(null)}
          onSend={send}
          onAttach={onAttach}
          onRecord={() => voice.start().catch(() => undefined)}
          onShareLocation={onShareLocation}
        />
      )}
    </Box>
  );
}
