import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_EVENT } from '../../graphql/events';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { DescriptionBlock } from './DescriptionBlock';
import { EventHero } from './EventHero';
import { HostBar } from './HostBar';
import { HostsBlock } from './HostsBlock';
import { RegistrationCard } from './RegistrationCard';
import { WhenBlock } from './WhenBlock';
import { WhereBlock } from './WhereBlock';
import { WhoIsGoing } from './WhoIsGoing';

/** The page once the event is in hand: details on the left, the registration card on the right. */
function EventView({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  return (
    <Stack spacing={3} data-testid="event-page">
      {event.viewer_is_host ? <HostBar event={event} onChanged={onChanged} /> : null}
      {event.status === 'CANCELLED' ? (
        <Alert severity="error" data-testid="event-cancelled">
          {t('liteWeb.event.cancelledBanner')}
          {event.cancel_reason ? ` ${t('liteWeb.event.cancelledReason', { vars: { reason: event.cancel_reason } })}` : ''}
        </Alert>
      ) : null}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'start' }}>
        <Stack spacing={3}>
          <EventHero event={event} />
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <WhenBlock event={event} />
                <WhereBlock event={event} />
                <WhoIsGoing event={event} />
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <HostsBlock event={event} />
                <DescriptionBlock text={event.description} />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
        <Box sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
          <RegistrationCard event={event} onChanged={onChanged} />
        </Box>
      </Box>
    </Stack>
  );
}

/** /e/:slug */
export function EventPage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  const { data, loading, error, refetch } = useQuery(LITE_EVENT, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  const event = data?.liteEvent ?? null;
  usePageTitle(event?.title ?? '', event?.description.slice(0, 160));
  if (!loading && !error && !event) return <NotFoundPage />;
  const reload = () => {
    refetch().catch(() => undefined);
  };
  return (
    <QueryGuard loading={loading && !event} error={error} loadingLabel={t('lite.common.loading')}>
      {() => (event ? <EventView event={event} onChanged={reload} /> : null)}
    </QueryGuard>
  );
}
