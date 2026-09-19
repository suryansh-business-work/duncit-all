import { Navigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Container, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { SignedInGate } from '../../components/SignedInGate';
import { LITE_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { EventForm } from './event.form';

export { EventForm } from './event.form';
export { eventDefaults, makeEventSchema, toEventInput } from './event.types';
export type { EventFormValues } from './event.types';

/** /create */
export function CreateEventPage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.eventForm.createTitle'));
  return (
    <Container maxWidth="md" disableGutters>
      <Stack spacing={3} data-testid="create-event-page">
        <PageHeader title={t('liteWeb.eventForm.createTitle')} subtitle={t('liteWeb.eventForm.createSubtitle')} titleVariant="h4" />
        <SignedInGate body={t('liteWeb.eventForm.gate')}>
          <EventForm event={null} />
        </SignedInGate>
      </Stack>
    </Container>
  );
}

/** The form once the event is loaded; only its hosts may edit, and a cancelled event is read-only. */
function EditLoader({ slug }: Readonly<{ slug: string }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_EVENT, { variables: { slug }, fetchPolicy: 'network-only' });
  const event = data?.liteEvent ?? null;
  if (!loading && !error && !event) return <NotFoundPage />;
  if (event && (!event.viewer_is_host || event.status === 'CANCELLED')) return <Navigate to={paths.event(event.slug)} replace />;
  return (
    <QueryGuard loading={loading && !event} error={error} loadingLabel={t('lite.common.loading')}>
      {() => (event ? <EventForm key={event.id} event={event} /> : null)}
    </QueryGuard>
  );
}

/** /e/:slug/edit */
export function EditEventPage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  usePageTitle(t('liteWeb.eventForm.editTitle'));
  return (
    <Container maxWidth="md" disableGutters>
      <Stack spacing={3} data-testid="edit-event-page">
        <PageHeader title={t('liteWeb.eventForm.editTitle')} titleVariant="h4" />
        <SignedInGate body={t('liteWeb.eventForm.gate')}>
          <EditLoader slug={slug} />
        </SignedInGate>
      </Stack>
    </Container>
  );
}
