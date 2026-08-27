import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventIcon from '@mui/icons-material/Event';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import CalendarLegend from './CalendarLegend';
import type { CalendarView } from './calendarMath';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <EventIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>{t('onboarding.meetings.meetingCalendar')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>{t('onboarding.meetings.scheduledAndAmpRequestedOnboardingMeetings')}</Typography>
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
        <Stack direction="row" sx={{
          alignItems: "center"
        }}>
          <DuncitIconButton size="small" aria-label={t('onboarding.meetings.previous')} onClick={() => onStep(-1)}><ChevronLeftIcon /></DuncitIconButton>
          <DuncitButton size="small" onClick={onToday} sx={{ fontWeight: 700 }}>{t('onboarding.meetings.today')}</DuncitButton>
          <DuncitIconButton size="small" aria-label={t('onboarding.meetings.next')} onClick={() => onStep(1)}><ChevronRightIcon /></DuncitIconButton>
        </Stack>
      </Stack>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}>
        <Typography variant="subtitle1" sx={{
          fontWeight: 800
        }}>{label}</Typography>
        <CalendarLegend />
      </Stack>
    </Stack>
  );
}
