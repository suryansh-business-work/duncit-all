import { Box, Tooltip } from '@mui/material';
import { format } from 'date-fns';
import type { CalEvent } from './useCalendarEvents';

interface Props {
  event: CalEvent;
  onClick: (e: CalEvent) => void;
  showTime?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Colour by urgency: overdue/now = red, within 24h = yellow, later = green. */
function urgencyBg(date: Date, done: boolean): string {
  if (done) return 'text.disabled';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'error.main';
  if (diff <= DAY_MS) return 'warning.main';
  return 'success.main';
}

/** Compact clickable event chip; colour encodes urgency (and done state). */
export default function EventPill({ event, onClick, showTime }: Props) {
  const done = event.status === 'DONE';
  const bg = urgencyBg(event.date, done);
  return (
    <Tooltip title={`${format(event.date, 'p')} · ${event.title}`}>
      <Box
        onClick={(e) => { e.stopPropagation(); onClick(event); }}
        sx={{
          bgcolor: bg,
          color: '#fff',
          borderRadius: 0.75,
          px: 0.5,
          py: 0.125,
          fontSize: 11,
          lineHeight: 1.4,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: done ? 0.7 : 1,
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {showTime ? `${format(event.date, 'p')} ` : ''}{event.title}
      </Box>
    </Tooltip>
  );
}
