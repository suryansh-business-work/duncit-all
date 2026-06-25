import { Box, Button, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventIcon from '@mui/icons-material/Event';
import CalendarLegend from './CalendarLegend';
import type { CalendarView } from './calendarMath';

interface Props {
  view: CalendarView;
  label: string;
  onView: (v: CalendarView) => void;
  onStep: (dir: 1 | -1) => void;
  onToday: () => void;
}

const VIEWS: CalendarView[] = ['day', 'week', 'month'];

/** Title, Day/Week/Month switch, prev/next/today nav and the colour legend. */
export default function CalendarHeader({ view, label, onView, onStep, onToday }: Readonly<Props>) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <EventIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h5" fontWeight={800}>Meeting Calendar</Typography>
          <Typography variant="body2" color="text.secondary">Scheduled &amp; requested onboarding meetings across venue, host and seller.</Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_e, v) => v && onView(v as CalendarView)}
        >
          {VIEWS.map((v) => (
            <ToggleButton key={v} value={v} sx={{ textTransform: 'capitalize', px: 1.5, fontWeight: 700 }}>{v}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" alignItems="center">
          <IconButton size="small" aria-label="Previous" onClick={() => onStep(-1)}><ChevronLeftIcon /></IconButton>
          <Button size="small" onClick={onToday} sx={{ fontWeight: 700 }}>Today</Button>
          <IconButton size="small" aria-label="Next" onClick={() => onStep(1)}><ChevronRightIcon /></IconButton>
        </Stack>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle1" fontWeight={800}>{label}</Typography>
        <CalendarLegend />
      </Stack>
    </Stack>
  );
}
