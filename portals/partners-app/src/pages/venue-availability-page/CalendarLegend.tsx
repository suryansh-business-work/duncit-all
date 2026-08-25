import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

function LegendItem({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{
      alignItems: "center"
    }}>
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>
    </Stack>
  );
}

/** What the A / P / B / × badges on a day cell mean, in the calendar's colours. */
export default function CalendarLegend() {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
      <LegendItem color="success.light" label={t('partners.venueAvailabilityPage.aAvailable')} />
      <LegendItem color="info.light" label={t('partners.venueAvailabilityPage.pPendingApproval')} />
      <LegendItem color="warning.light" label={t('partners.venueAvailabilityPage.bBooked')} />
      <LegendItem color="grey.300" label={t('partners.venueAvailabilityPage.blocked')} />
      <LegendItem color="error.light" label={t('partners.venueAvailabilityPage.leaveHoliday')} />
    </Stack>
  );
}
