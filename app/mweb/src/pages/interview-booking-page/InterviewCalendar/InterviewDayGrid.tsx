import { Box, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { isPastDay, isSameDay } from '../slotHelpers';

interface InterviewDayGridProps {
  cells: { key: string; date: Date | null }[];
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
}

/** The month's weekday header and day buttons; past days are disabled. */
export default function InterviewDayGrid({ cells, selectedDate, setSelectedDate }: Readonly<InterviewDayGridProps>) {
  return (
  <Box
    sx={{
      mt: 2,
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 0.5,
    }}
  >
    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
      <Typography
        key={`${d}-${i}`}
        variant="caption"
        align="center"
        sx={{
          color: "text.secondary",
          py: 1
        }}>
        {d}
      </Typography>
    ))}
    {cells.map(({ key, date: d }) => {
      if (!d) return <Box key={key} />;
      const past = isPastDay(d);
      const active = selectedDate && isSameDay(d, selectedDate);
      const inactiveColor = past ? 'text.secondary' : 'text.primary';
      const dayTestId = `interview-calendar-day-${key}`;
      return (
        <DuncitButton
          key={key}
          data-testid={dayTestId}
          onClick={() => !past && setSelectedDate(d)}
          disabled={past}
          aria-pressed={Boolean(active)}
          sx={{
            minWidth: 0,
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            p: 0,
            fontWeight: active ? 600 : 500,
            bgcolor: active ? 'primary.main' : 'transparent',
            color: active ? 'primary.contrastText' : inactiveColor,
            '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
          }}
        >
          {d.getDate()}
        </DuncitButton>
      );
    })}
  </Box>
  );
}
