import { useCallback, useMemo, useState } from 'react';
import { Box, CircularProgress, FormHelperText, Stack, Typography } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers';

import { groupSlotsByDay, resolveSlotDay, slotDayBounds, slotDayKeys } from '../group';
import type { CalendarSlot, SlotFormatter, SlotLabels } from '../types';
import SlotDayCell from './SlotDayCell';
import SlotTimeGrid from './SlotTimeGrid';

export interface SlotCalendarProps {
  slots: readonly CalendarSlot[];
  loading?: boolean;
  error?: string | null;
  selectedSlotId: string;
  onPick: (slot: CalendarSlot) => void;
  /** From `useDateFormat()` — drives the zone, the day keys and the time format. */
  fmt: SlotFormatter & { formatPattern: (input: Date, pattern: string) => string };
  labels: Readonly<SlotLabels>;
  required?: boolean;
  /** Meeting pickers have no pricing, so their tiles show the caption instead. */
  showPrice?: boolean;
}

/** A local 'yyyy-MM-dd' from a Date's own civil fields — never re-zoned, so the
 * key MUIX hands back matches the key the grid was built from. */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayKeyToDate(key: string): Date | null {
  return key ? new Date(`${key}T00:00:00`) : null;
}

/**
 * Pick a date on a calendar, then a time on that date — the one slot-selection
 * experience, for the portals and mWeb. The Tamagui twin in ../native renders
 * the same steps from the same helpers.
 *
 * Purely presentational: slots come in as a prop and the choice goes out through
 * `onPick`, so the same component serves venue availability and meeting slots.
 */
export default function SlotCalendar({
  slots,
  loading = false,
  error,
  selectedSlotId,
  onPick,
  fmt,
  labels,
  required = false,
  showPrice = true,
}: Readonly<SlotCalendarProps>) {
  const [override, setOverride] = useState<string | null>(null);

  const days = useMemo(() => groupSlotsByDay(slots, fmt), [slots, fmt]);
  const enabled = useMemo(() => slotDayKeys(days), [days]);
  const bounds = useMemo(() => slotDayBounds(days), [days]);
  const { activeDay, daySlots } = resolveSlotDay(days, selectedSlotId, override);

  const hasSlots = useCallback((day: Date) => enabled.has(localDayKey(day)), [enabled]);
  const shouldDisableDate = useCallback((day: Date) => !enabled.has(localDayKey(day)), [enabled]);

  if (loading && days.length === 0) {
    return (
      <Stack
        data-testid="slot-calendar-loading"
        sx={{
          alignItems: "center",
          py: 3
        }}>
        <CircularProgress size={22} />
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            mt: 1
          }}>
          {labels.loading}
        </Typography>
      </Stack>
    );
  }

  if (days.length === 0) {
    return (
      <Stack spacing={1}>
        <Typography variant="body2" data-testid="slot-calendar-empty" sx={{
          color: "text.secondary"
        }}>
          {labels.empty}
        </Typography>
        {error && <FormHelperText error>{error}</FormHelperText>}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25} data-testid="slot-calendar">
      <Box>
        <Typography variant="subtitle2" sx={{
          fontWeight: 800
        }}>
          {labels.date}
          {required && (
            <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>
              *
            </Box>
          )}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {labels.hint}
        </Typography>
      </Box>

      {/* mWeb mounts no app-wide provider, so the calendar brings its own. The
       * portals already have one from the shell; nesting is harmless. */}
      <DateCalendar
        value={dayKeyToDate(activeDay)}
        onChange={(next) => {
          if (next) setOverride(localDayKey(next));
        }}
        shouldDisableDate={shouldDisableDate}
        minDate={bounds ? dayKeyToDate(bounds.first) ?? undefined : undefined}
        maxDate={bounds ? dayKeyToDate(bounds.last) ?? undefined : undefined}
        views={['day']}
        slots={{ day: SlotDayCell }}
        slotProps={{ day: { hasSlots } as never }}
        sx={{
          width: '100%',
          maxWidth: 360,
          mx: 'auto',
          // MUIX lays the weekday labels and the day cells out as two
          // independent flex rows, sized from their own content. Stretching
          // only the header (which this used to do) therefore slid the labels
          // out of line with the dates under them. Both rows share one
          // 7-equal-column grid instead, so alignment holds at any width and
          // whatever a day cell renders inside.
          '& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer': {
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            justifyItems: 'center',
          },
          '& .MuiDayCalendar-weekDayLabel, & .MuiPickersDay-root': { margin: 0 },
        }}
      />

      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            mb: 0.75
          }}>
          {labels.availableSlots}
        </Typography>
        {daySlots.length > 0 ? (
          <SlotTimeGrid
            slots={daySlots}
            selectedSlotId={selectedSlotId}
            onPick={onPick}
            fmt={fmt}
            freeLabel={labels.free}
            wholeDayLabel={labels.wholeDay}
            showPrice={showPrice}
          />
        ) : (
          <Typography variant="body2" data-testid="slot-calendar-empty-day" sx={{
            color: "text.secondary"
          }}>
            {labels.emptyDay}
          </Typography>
        )}
      </Box>

      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}
