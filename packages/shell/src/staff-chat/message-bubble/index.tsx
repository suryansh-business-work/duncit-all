import { useState } from 'react';
import { Box, Paper } from '@mui/material';
import MessageReactions from '../MessageReactions';
import BubbleBadges from './BubbleBadges';
import BubbleBody from './BubbleBody';
import BubbleFooter from './BubbleFooter';
import type { ChatSettings } from '../useChatSettings';
import type { StaffMessage } from '../queries';

export interface MessageBubbleProps {
  message: StaffMessage;
  mine: boolean;
  /** The reader's own id, so their reaction reads as pressed. */
  meId: string;
  settings: ChatSettings;
  /** Formatters built once for the whole thread. */
  formats: { time: Intl.DateTimeFormat; full: Intl.DateTimeFormat };
  /** Names, for reaction tooltips and the reply strip. */
  nameOf: (userId: string) => string;
  /** The message this one answers, when it is still loaded. */
  repliedTo?: StaffMessage | null;
  /** Bulk selection — undefined when selection mode is off. */
  selected?: boolean;
  onSelect?: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string, forEveryone: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (message: StaffMessage) => void;
  onForward: (message: StaffMessage) => void;
  onPin: (id: string) => void;
  onRetry?: (message: StaffMessage) => void;
  onNavigate?: (path: string) => void;
}

/**
 * One line of the conversation.
 *
 * Everything that can be done to a message lives on the bubble rather than
 * behind a long-press: this is a desktop tool and the mouse is already there.
 * The controls appear on hover AND on focus — a keyboard has to be able to
 * reach them, and a hover rule alone would lock it out.
 *
 * Split into badges, body and footer because a bubble that renders all three
 * inline is one function with every branch of the feature in it.
 */
export default function MessageBubble({
  message,
  mine,
  meId,
  settings,
  formats,
  nameOf,
  repliedTo,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onReact,
  onReply,
  onForward,
  onPin,
  onRetry,
  onNavigate,
}: Readonly<MessageBubbleProps>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  const deleted = Boolean(message.deleted_at);
  const compact = settings.density === 'COMPACT';
  const own = mine && !deleted;

  const save = () => {
    const text = draft.trim();
    if (text && text !== message.text) onEdit(message.id, text);
    setEditing(false);
  };

  return (
    <Box
      onClick={onSelect ? () => onSelect(message.id) : undefined}
      sx={{
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        bgcolor: selected ? 'action.selected' : 'transparent',
        borderRadius: 1,
        cursor: onSelect ? 'pointer' : 'default',
        // Arriving messages settle in rather than appearing, so the eye follows
        // the movement instead of hunting for what changed.
        animation: 'staffChatIn 160ms ease-out',
        '@keyframes staffChatIn': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          px: compact ? 1 : 1.25,
          py: compact ? 0.4 : 0.75,
          maxWidth: '85%',
          borderRadius: 2,
          bgcolor: own ? `${settings.bubbleColor}.main` : 'background.paper',
          color: own ? `${settings.bubbleColor}.contrastText` : 'text.primary',
          borderColor: own ? `${settings.bubbleColor}.main` : 'divider',
          '& .staff-bubble-tools, & .staff-reaction-picker': { visibility: 'hidden' },
          '&:hover .staff-bubble-tools, &:focus-within .staff-bubble-tools': { visibility: 'visible' },
          '&:hover .staff-reaction-picker, &:focus-within .staff-reaction-picker': {
            visibility: 'visible',
          },
        }}
      >
        {!deleted && (
          <BubbleBadges message={message} own={own} nameOf={nameOf} repliedTo={repliedTo} />
        )}

        <BubbleBody
          message={message}
          deleted={deleted}
          editing={editing}
          draft={draft}
          fontSize={settings.fontSize}
          onDraft={setDraft}
          onSave={save}
          onCancel={() => setEditing(false)}
          onNavigate={onNavigate}
        />

        {!deleted && (
          <MessageReactions
            reactions={message.reactions ?? []}
            meId={meId}
            nameOf={nameOf}
            onReact={(emoji) => onReact(message.id, emoji)}
          />
        )}

        <BubbleFooter
          message={message}
          mine={mine}
          editing={editing}
          deleted={deleted}
          formats={formats}
          onReply={() => onReply(message)}
          onForward={() => onForward(message)}
          onPin={() => onPin(message.id)}
          onCopy={() => {
            globalThis.navigator.clipboard?.writeText(message.text).catch(() => undefined);
          }}
          onEdit={() => {
            setDraft(message.text);
            setEditing(true);
          }}
          onDelete={(forEveryone) => onDelete(message.id, forEveryone)}
          onRetry={onRetry ? () => onRetry(message) : undefined}
        />
      </Paper>
    </Box>
  );
}
