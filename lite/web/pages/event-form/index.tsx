import { Navigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { SignedInGate } from '../../components/SignedInGate';
import { LITE_EVENT } from '../../graphql/events';
import { visuallyHidden } from '../../lib/a11y';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { EventForm } from './event.form';
import { EventFormSkeleton } from './EventFormSkeleton';

export { EventForm } from './event.form';
export { eventDefaults, makeEventSchema, toEventInput } from './event.types';
export type { EventFormValues } from './event.types';

const PAGE_SX = { maxWidth: 980, mx: 'auto' } as const;

/** /create — one page: cover and theme on the left, everything else on the right. */
export function CreateEventPage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.eventForm.createTitle'));
  return (
    <Box sx={PAGE_SX} data-testid="create-event-page">
      <Typography variant="h1" sx={visuallyHidden}>
        {t('liteWeb.eventForm.createTitle')}
      </Typography>
      <SignedInGate skeleton={<EventFormSkeleton />} body={t('liteWeb.eventForm.gate')}>
        <EventForm event={null} />
      </SignedInGate>
    </Box>
  );
}

/** The form once the event is loaded; only its hosts may edit, and a cancelled event is read-only. */
function EditLoader({ slug }: Readonly<{ slug: string }>) {
  const { data, loading, error } = useQuery(LITE_EVENT, { variables: { slug }, fetchPolicy: 'network-only' });
  const event = data?.liteEvent ?? null;
  if (!loading && !error && !event) return <NotFoundPage />;
  if (event && (!event.viewer_is_host || event.status === 'CANCELLED')) return <Navigate to={paths.event(event.slug)} replace />;
  return (
    <QueryGuard loading={loading && !event} error={error} skeleton={<EventFormSkeleton />}>
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
    <Box sx={PAGE_SX} data-testid="edit-event-page">
      <Typography variant="h1" sx={visuallyHidden}>
        {t('liteWeb.eventForm.editTitle')}
      </Typography>
      <SignedInGate skeleton={<EventFormSkeleton />} body={t('liteWeb.eventForm.gate')}>
        <EditLoader slug={slug} />
      </SignedInGate>
    </Box>
  );
}
