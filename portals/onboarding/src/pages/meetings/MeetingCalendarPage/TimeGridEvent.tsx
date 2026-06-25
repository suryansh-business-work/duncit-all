import { Box, Tooltip, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { OnboardingMeeting } from '../queries';
import { displayStatus, eventStart, statusMeta } from '../calendarColors';
import { dayFraction } from './calendarMath';

interface Props {
  meeting: OnboardingMeeting;
  lo: number;
  hi: number;
  slotMinutes: number;
  now: number;
  onSelect: (m: OnboardingMeeting) => void;
  onContext: (e: React.MouseEvent, m: OnboardingMeeting) => void;
}

const clamp = (n: number) => Math.min(Math.max(n, 0), 100);

/** A single meeting block positioned by its start time inside a day column. */
export default function TimeGridEvent({ meeting, lo, hi, slotMinutes, now, onSelect, onContext }: Readonly<Props>) {
  const start = eventStart(meeting);
  const top = clamp(dayFraction(start, lo, hi) * 100);
  const height = Math.max((slotMinutes / ((hi - lo) * 60)) * 100, 4);
  const status = displayStatus(meeting, slotMinutes, now);
  const meta = statusMeta(status);
  const cancelled = status === 'CANCELLED';
  const who = meeting.user_name || meeting.contact_name || meeting.kind;

  return (
    <Tooltip title={`${meeting.kind} · ${who} · ${meta.label}`}>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => onSelect(meeting)}
        onContextMenu={(e) => onContext(e, meeting)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(meeting)}
        sx={{
          position: 'absolute',
          top: `${top}%`,
          height: `${height}%`,
          left: 2,
          right: 2,
          minHeight: 16,
          bgcolor: cancelled ? 'transparent' : meta.color,
          color: cancelled ? meta.color : '#fff',
          border: cancelled ? `1.5px dashed ${meta.color}` : 'none',
          borderRadius: 0.75,
          px: 0.5,
          py: 0.25,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: cancelled ? 0 : 1,
          zIndex: 2,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', lineHeight: 1.2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', textDecoration: cancelled ? 'line-through' : 'none' }}>
          {format(start, 'p')} {who}
        </Typography>
      </Box>
    </Tooltip>
  );
}
