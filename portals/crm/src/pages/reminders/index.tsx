import { Box, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CalendarSection from '../../components/calendar/CalendarSection';
import { useTranslation } from '@duncit/shell';

/** CRM → Reminders: full-page calendar of reminders + lead follow-ups. */
export default function RemindersPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <EventIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>{t('shell.nav.reminders')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Calendar of reminders and lead follow-ups. Overdue is red, due soon is amber, later is green.
          </Typography>
        </Box>
      </Stack>
      <CalendarSection />
    </Stack>
  );
}
