import { Box, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CalendarSection from '../../components/calendar/CalendarSection';

/** CRM → Reminders: full-page calendar of reminders + lead follow-ups. */
export default function RemindersPage() {
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <EventIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>Reminders</Typography>
          <Typography variant="body2" color="text.secondary">
            Calendar of reminders and lead follow-ups. Overdue is red, due soon is amber, later is green.
          </Typography>
        </Box>
      </Stack>
      <CalendarSection />
    </Stack>
  );
}
