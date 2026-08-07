import { Box, Chip, Divider } from '@mui/material';
import MessageBubble from './message-bubble';
import { DaySeparator } from './ThreadChrome';
import type { StaffMessage } from './queries';
import type { ChatFormats, ChatSettings } from './useChatSettings';

interface Props {
  message: StaffMessage;
  meId: string;
  settings: ChatSettings;
  formats: ChatFormats;
  nameOf: (userId: string) => string;
  repliedTo: StaffMessage | null;
  /** The day chip above this message, or '' when it is not the first of a day. */
  dayLabel: string;
  /** True on the first message the reader has not opened. */
  firstUnread: boolean;
  /** True while a search hit is being shown — flashes the background. */
  highlighted: boolean;
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
  /** Registers the node so the thread can scroll to it. */
  onNode: (id: string, node: HTMLDivElement | null) => void;
}

/**
 * One row of the thread: the separators that belong above a message, and the
 * message.
 *
 * Split from the thread so the scroll and paging logic is not sharing a file
 * with the day-boundary rules.
 */
export default function ThreadItem({
  message,
  meId,
  settings,
  formats,
  nameOf,
  repliedTo,
  dayLabel,
  firstUnread,
  highlighted,
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
  onNode,
}: Readonly<Props>) {
  return (
    <Box
      ref={(node: HTMLDivElement | null) => onNode(message.id, node)}
      sx={{
        borderRadius: 1,
        transition: 'background-color 600ms ease-out',
        bgcolor: highlighted ? 'action.selected' : 'transparent',
      }}
    >
      {dayLabel && <DaySeparator label={dayLabel} />}
      {firstUnread && (
        <Divider sx={{ my: 1 }} role="separator">
          <Chip size="small" color="error" label="New" sx={{ height: 22, fontSize: 11 }} />
        </Divider>
      )}
      <MessageBubble
        message={message}
        mine={message.from_user_id === meId}
        meId={meId}
        settings={settings}
        formats={formats}
        nameOf={nameOf}
        repliedTo={repliedTo}
        selected={selected}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
        onReply={onReply}
        onForward={onForward}
        onPin={onPin}
        onRetry={onRetry}
        onNavigate={onNavigate}
      />
    </Box>
  );
}
