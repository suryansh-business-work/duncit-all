import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { format, isSameDay, isToday } from 'date-fns';
import { HOLIDAY_TYPE_LABELS, type MeetingAvailability, type MeetingHoliday, type OnboardingMeeting } from '../queries';
import { CAL, calBackgrounds, eventStart } from '../calendarColors';
import TimeGridEvent from './TimeGridEvent';
import { dayFraction, hourRange, isWeekendDay, isWorkingHour } from './calendarMath';

const HOUR_PX = 48;
const GUTTER = 56;

type CalBg = ReturnType<typeof calBackgrounds>;

interface Props {
  days: Date[];
  meetings: OnboardingMeeting[];
  holidays: Map<string, MeetingHoliday>;
  availability?: MeetingAvailability;
  slotMinutes: number;
  now: number;
  onSelect: (m: OnboardingMeeting) => void;
  onContext: (e: React.MouseEvent, m: OnboardingMeeting) => void;
}

const hourLabel = (h: number) => format(new Date(2020, 0, 1, h), 'h a');

function bandBg(av: MeetingAvailability | undefined, day: Date, hour: number, bg: CalBg): string {
  if (!isWorkingHour(av, day, hour)) return bg.nonWorking;
  if (isToday(day)) return bg.today;
  if (isWeekendDay(day)) return bg.weekend;
  return bg.working;
}

function headerBg(day: Date, holiday: boolean, bg: CalBg): string {
  if (holiday) return bg.holiday;
  if (isToday(day)) return bg.today;
  return 'transparent';
}

/** Outlook-style hourly time grid for the Day & Week views. */
export default function TimeGridView({ days, meetings, holidays, availability, slotMinutes, now, onSelect, onContext }: Readonly<Props>) {
  const bg = calBackgrounds(useTheme());
  const eventHours = meetings.map((m) => eventStart(m).getHours());
  const [lo, hi] = hourRange(availability, eventHours);
  const hours = Array.from({ length: hi - lo }, (_, i) => lo + i);
  const nowDate = new Date(now);
  const nowVisible = nowDate.getHours() >= lo && nowDate.getHours() < hi;
  const nowPct = dayFraction(nowDate, lo, hi) * 100;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: days.length > 1 ? 640 : 320 }}>
        {/* Day header row */}
        <Stack direction="row" sx={{ pl: `${GUTTER}px`, borderBottom: 1, borderColor: 'divider' }}>
          {days.map((day) => {
            const holiday = holidays.get(format(day, 'yyyy-MM-dd'));
            const holidayNamePart = holiday?.name ? ` · ${holiday.name}` : '';
            return (
              <Box key={day.toISOString()} sx={{ flex: 1, textAlign: 'center', py: 0.5, bgcolor: headerBg(day, !!holiday, bg) }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{format(day, 'EEE')}</Typography>
                <Typography variant="subtitle2" fontWeight={isToday(day) ? 800 : 600}>{format(day, 'd')}</Typography>
                {holiday && (
                  <Tooltip title={`${HOLIDAY_TYPE_LABELS[holiday.type]}${holidayNamePart}`}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'warning.main', fontWeight: 700, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {holiday.name || HOLIDAY_TYPE_LABELS[holiday.type]}
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Stack>

        {/* Time grid body */}
        <Stack direction="row">
          {/* Hour gutter */}
          <Box sx={{ width: GUTTER, flexShrink: 0 }}>
            {hours.map((h) => (
              <Box key={h} sx={{ height: HOUR_PX, position: 'relative' }}>
                <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: -8, right: 6 }}>{hourLabel(h)}</Typography>
              </Box>
            ))}
          </Box>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = meetings.filter((m) => isSameDay(eventStart(m), day));
            const dayIsHoliday = holidays.has(format(day, 'yyyy-MM-dd'));
            return (
              <Box key={day.toISOString()} sx={{ flex: 1, position: 'relative', borderLeft: 1, borderColor: 'divider' }}>
                {hours.map((h) => (
                  <Box key={h} sx={{ height: HOUR_PX, borderBottom: 1, borderColor: 'divider', bgcolor: dayIsHoliday ? bg.holiday : bandBg(availability, day, h, bg) }} />
                ))}
                {dayEvents.map((m) => (
                  <TimeGridEvent key={m.id} meeting={m} lo={lo} hi={hi} slotMinutes={slotMinutes} now={now} onSelect={onSelect} onContext={onContext} />
                ))}
                {isToday(day) && nowVisible && (
                  <Box sx={{ position: 'absolute', left: 0, right: 0, top: `${nowPct}%`, borderTop: `2px solid ${CAL.nowLine}`, zIndex: 3, pointerEvents: 'none' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CAL.nowLine, position: 'absolute', left: -4, top: -5 }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
