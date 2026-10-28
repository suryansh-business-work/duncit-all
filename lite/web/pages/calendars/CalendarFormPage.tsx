import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Container, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { SignedInGate } from '../../components/SignedInGate';
import { LITE_MY_CALENDARS } from '../../graphql/calendars';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { CalendarForm } from './calendar-form';

/** The edit form, once the calendar is found among the reader's own. */
function EditCalendar({ id }: Readonly<{ id: string }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_MY_CALENDARS);
  const calendar = data?.liteMyCalendars.find((row) => row.id === id) ?? null;
  if (!loading && !error && !calendar) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
      {() => (calendar ? <CalendarForm calendar={calendar} /> : null)}
    </QueryGuard>
  );
}

/** /calendars/new and /calendars/:id/edit */
export function CalendarFormPage() {
  const { t } = useWebT();
  const { id } = useParams();
  const title = id ? t('liteWeb.calendars.editTitle') : t('liteWeb.calendars.newTitle');
  usePageTitle(title);
  return (
    <Container maxWidth={false} disableGutters sx={{ maxWidth: 800 }}>
      <Stack spacing={3} data-testid="calendar-form-page">
        <PageHeader title={title} subtitle={t('liteWeb.calendars.formSubtitle')} titleVariant="h4" />
        <SignedInGate body={t('liteWeb.calendars.gate')}>{id ? <EditCalendar id={id} /> : <CalendarForm calendar={null} />}</SignedInGate>
      </Stack>
    </Container>
  );
}
