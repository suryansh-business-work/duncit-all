import { useMemo } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { DuncitRoundButton } from '@duncit/buttons';
import { Slot, TIME_OPTIONS, buildMonth, slotKey } from '../slotHelpers';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';
import { useTranslation } from '../../../i18n/useTranslation';
import InterviewDayGrid from './InterviewDayGrid';

interface InterviewCalendarProps {
  anchor: Date;
  setAnchor: (d: Date) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
  slots: Map<string, Slot>;
  onToggleSlot: (date: Date, hhmm: string) => void;
  onRemoveSlot: (slot: Slot) => void;
}

export default function InterviewCalendar({
  anchor,
  setAnchor,
  selectedDate,
  setSelectedDate,
  slots,
  onToggleSlot,
  onRemoveSlot,
}: Readonly<InterviewCalendarProps>) {
  const { t } = useTranslation();
  const cells = useMemo(
    () =>
      buildMonth(anchor).map((date, i) => ({
        key: date ? date.toDateString() : `blank-${i}`,
        date,
      })),
    [anchor]
  );
  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const slotList = Array.from(slots.values()).sort((a, b) => +a.start - +b.start);

  const goPrevMonth = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    if (
      next.getFullYear() < today.getFullYear() ||
      (next.getFullYear() === today.getFullYear() && next.getMonth() < today.getMonth())
    )
      return;
    setAnchor(next);
  };
  const goNextMonth = () =>
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));

  return (
    <Card data-testid="interview-calendar">
      <CardContent>
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center"
          }}>
          <Typography variant="h6" component="h2" aria-live="polite" sx={{ fontSize: '1.0625rem' }}>{monthLabel}</Typography>
          <Stack direction="row" spacing={1}>
            <DuncitRoundButton
              data-testid="interview-calendar-prev-month"
              tone="surface"
              aria-label={t('mweb.slots.previousMonth')}
              onClick={goPrevMonth}
            >
              <ChevronLeftRoundedIcon />
            </DuncitRoundButton>
            <DuncitRoundButton
              data-testid="interview-calendar-next-month"
              tone="surface"
              aria-label={t('mweb.slots.nextMonth')}
              onClick={goNextMonth}
            >
              <ChevronRightRoundedIcon />
            </DuncitRoundButton>
          </Stack>
        </Stack>
        <InterviewDayGrid cells={cells} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

        {selectedDate && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Pick time slots on{' '}
              {formatDate(selectedDate)}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {TIME_OPTIONS.map((time) => {
                const key = slotKey(selectedDate, time);
                const selected = slots.has(key);
                const slotTestId = `interview-calendar-slot-${time}`;
                return (
                  <Chip
                    key={time}
                    data-testid={slotTestId}
                    label={time}
                    variant="filled"
                    color={selected ? 'primary' : 'default'}
                    aria-pressed={selected}
                    onClick={() => onToggleSlot(selectedDate, time)}
                    icon={selected ? <CheckCircleIcon /> : undefined}
                    sx={{ height: 40, minHeight: 40, px: 0.5 }}
                  />
                );
              })}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                mt: 1,
                display: 'block'
              }}>
              Each slot is 1 hour. Choose up to 5 across any dates.
            </Typography>
          </Box>
        )}

        {slotList.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mb: 1
              }}>
              <EventAvailableIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">
                Your preferred slots ({slotList.length}/5)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {slotList.map((s) => {
                const isoStart = s.start.toISOString();
                return (
                  <Chip
                    key={isoStart}
                    data-testid={`interview-calendar-selected-slot-${isoStart}`}
                    label={formatDateTime(s.start)}
                    onDelete={() => onRemoveSlot(s)}
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
