import { Stack, Typography } from '@mui/material';
import { useWebT } from '../../../shared/i18n';
import { SignedInGate } from '../../components/SignedInGate';
import { usePageTitle } from '../../lib/usePageTitle';
import { MyCalendars } from './MyCalendars';
import { SubscribedCalendars } from './SubscribedCalendars';

export { CalendarFormPage } from './CalendarFormPage';

/** /calendars — the calendars the reader owns, then the ones they follow. */
export function CalendarsPage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.calendars.pageTitle'));
  return (
    <Stack spacing={4} sx={{ maxWidth: 960, mx: 'auto', width: '100%' }} data-testid="calendars-page">
      <Typography variant="h2" component="h1">
        {t('liteWeb.calendars.pageTitle')}
      </Typography>
      <SignedInGate body={t('liteWeb.calendars.gate')}>
        <Stack spacing={5}>
          <MyCalendars />
          <SubscribedCalendars />
        </Stack>
      </SignedInGate>
    </Stack>
  );
}
