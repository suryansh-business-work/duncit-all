import { Box } from '@mui/material';
import CallRow from './CallRow';
import ThreadItem from './ThreadItem';
import { DaySeparator, OFFSCREEN_SKIP } from './ThreadChrome';
import type { TimelineEntry } from './timeline';
import type { StaffMessage } from './queries';
import type { ChatFormats, ChatSettings } from './useChatSettings';

export interface ThreadEntryHandlers {
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string, forEveryone: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (message: StaffMessage) => void;
  onForward: (message: StaffMessage) => void;
  onPin: (id: string) => void;
  onRetry?: (message: StaffMessage) => void;
  onNavigate?: (path: string) => void;
  onSelect?: (id: string) => void;
  onStartSelect?: (id: string) => void;
  onEditHistory?: (message: StaffMessage) => void;
  onPlayRecording: (url: string) => void;
  onNode: (id: string, node: HTMLDivElement | null) => void;
}

interface Props extends ThreadEntryHandlers {
  entry: TimelineEntry;
  meId: string;
  settings: ChatSettings;
  formats: ChatFormats;
  /** Names, for reaction tooltips and the reply strip. */
  nameOf: (userId: string) => string;
  /** The day chip above this entry, or '' when it is not the first of a day. */
  dayLabel: string;
  firstUnread: boolean;
  highlighted: boolean;
  selected: boolean;
  repliedTo: StaffMessage | null;
}

/**
 * One row of the thread, whichever kind it is.
 *
 * A call and a message are different things that share a position in time, so
 * the choice between them belongs here rather than in the middle of the
 * thread's scroll and paging logic.
 */
export default function ThreadEntry({
  entry,
  meId,
  settings,
  formats,
  nameOf,
  dayLabel,
  firstUnread,
  highlighted,
  selected,
  repliedTo,
  onPlayRecording,
  ...handlers
}: Readonly<Props>) {
  if (entry.kind === 'CALL') {
    return (
      <Box sx={OFFSCREEN_SKIP}>
        {dayLabel && <DaySeparator label={dayLabel} />}
        <CallRow call={entry.call} meId={meId} formats={formats} onPlay={onPlayRecording} />
      </Box>
    );
  }

  return (
    <ThreadItem
      message={entry.message}
      meId={meId}
      settings={settings}
      formats={formats}
      nameOf={nameOf}
      repliedTo={repliedTo}
      dayLabel={dayLabel}
      firstUnread={firstUnread}
      highlighted={highlighted}
      selected={selected}
      {...handlers}
    />
  );
}
