import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { HOLIDAY_TYPE_LABELS, type MeetingHoliday, type OnboardingMeeting } from '../queries';
import { CAL, displayStatus, eventStart, statusMeta } from '../calendarColors';
import { isWeekendDay } from './calendarMath';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOLIDAY_BG = '#FFF7ED';

interface Props {
  days: Date[];
  cursor: Date;
  meetings: OnboardingMeeting[];
  holidays: Map<string, MeetingHoliday>;
  slotMinutes: number;
  now: number;
  onSelect: (m: OnboardingMeeting) => void;
  onContext: (e: React.MouseEvent, m: OnboardingMeeting) => void;
}

function cellBg(day: Date, cursor: Date): string {
  if (!isSameMonth(day, cursor)) return '#0000000a';
  if (isToday(day)) return CAL.today;
  if (isWeekendDay(day)) return CAL.weekend;
  return CAL.working;
}

/** Month grid: each day shows up to three colour-coded meeting chips. */
export default function MonthView({ days, cursor, meetings, holidays, slotMinutes, now, onSelect, onContext }: Readonly<Props>) {
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {WEEKDAYS.map((d) => (
          <Typography key={d} variant="caption" color="text.secondary" sx={{ p: 0.5, fontWeight: 700, textAlign: 'center' }}>{d}</Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: 1, borderLeft: 1, borderColor: 'divider' }}>
        {days.map((day) => {
          const dayMeetings = meetings.filter((m) => isSameDay(eventStart(m), day));
          const muted = !isSameMonth(day, cursor);
          const holiday = holidays.get(format(day, 'yyyy-MM-dd'));
          return (
            <Box key={day.toISOString()} sx={{ minHeight: 96, borderRight: 1, borderBottom: 1, borderColor: 'divider', p: 0.5, bgcolor: holiday ? HOLIDAY_BG : cellBg(day, cursor) }}>
              <Typography variant="caption" sx={{ fontWeight: isToday(day) ? 800 : 500, color: muted ? 'text.disabled' : 'text.primary' }}>{format(day, 'd')}</Typography>
              {holiday && (
                <Tooltip title={`${HOLIDAY_TYPE_LABELS[holiday.type]}${holiday.name ? ` · ${holiday.name}` : ''}`}>
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={holiday.name || HOLIDAY_TYPE_LABELS[holiday.type]}
                    sx={{ display: 'flex', height: 16, fontSize: 9, mt: 0.25, maxWidth: '100%' }}
                  />
                </Tooltip>
              )}
              <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                {dayMeetings.slice(0, 3).map((m) => {
                  const status = displayStatus(m, slotMinutes, now);
                  const meta = statusMeta(status);
                  const cancelled = status === 'CANCELLED';
                  return (
                    <Tooltip key={m.id} title={`${m.kind} · ${m.user_name || m.contact_name || 'Applicant'} · ${meta.label}`}>
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(m)}
                        onContextMenu={(e) => onContext(e, m)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(m)}
                        sx={{ bgcolor: cancelled ? 'transparent' : meta.color, color: cancelled ? meta.color : '#fff', border: cancelled ? `1px dashed ${meta.color}` : 'none', borderRadius: 0.5, px: 0.5, fontSize: 10, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: cancelled ? 'line-through' : 'none' }}
                      >
                        {format(eventStart(m), 'p')} {m.user_name || m.contact_name || m.kind}
                      </Box>
                    </Tooltip>
                  );
                })}
                {dayMeetings.length > 3 && <Typography variant="caption" color="text.secondary">+{dayMeetings.length - 3} more</Typography>}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
