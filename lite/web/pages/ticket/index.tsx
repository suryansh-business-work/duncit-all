import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CardContent, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { eventWhen } from '../../../shared/format';
import { useWebT } from '../../../shared/i18n';
import { EventCard } from '../../components/events/EventCard';
import { SignedInGate } from '../../components/SignedInGate';
import { LITE_REGISTRATION, type LiteTicket } from '../../graphql/registrations';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { CheckInCode } from './CheckInCode';
import { PaymentPanel } from './payment-panel';
import { TicketDetails } from './TicketDetails';

function TicketView({ ticket, onChanged }: Readonly<{ ticket: LiteTicket; onChanged: () => void }>) {
  const { t } = useWebT();
  const when = eventWhen(ticket.event.start_at, ticket.event.end_at, ticket.event.timezone);
  return (
    <Stack spacing={3} data-testid="ticket-page">
      <PageHeader title={ticket.event.title} subtitle={`${when.date} · ${when.time}`} titleVariant="h4" />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'start' }}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <CheckInCode code={ticket.code} />
            </CardContent>
          </Card>
          {ticket.status === 'PAYMENT_PENDING' ? <PaymentPanel ticket={ticket} onChanged={onChanged} /> : null}
          <TicketDetails ticket={ticket} onChanged={onChanged} />
        </Stack>
        <Stack spacing={1}>
          <Box component="h2" sx={{ m: 0, typography: 'h5' }}>
            {t('liteWeb.ticket.eventTitle')}
          </Box>
          <EventCard event={ticket.event} />
        </Stack>
      </Box>
    </Stack>
  );
}

function TicketLoader({ id }: Readonly<{ id: string }>) {
  const { t } = useWebT();
  const { data, loading, error, refetch } = useQuery(LITE_REGISTRATION, { variables: { id }, fetchPolicy: 'cache-and-network' });
  const ticket = data?.liteRegistration ?? null;
  usePageTitle(ticket ? t('liteWeb.ticket.title', { vars: { event: ticket.event.title } }) : '');
  if (!loading && !error && !ticket) return <NotFoundPage />;
  const reload = () => {
    refetch().catch(() => undefined);
  };
  return (
    <QueryGuard loading={loading && !ticket} error={error} loadingLabel={t('lite.common.loading')}>
      {() => (ticket ? <TicketView ticket={ticket} onChanged={reload} /> : null)}
    </QueryGuard>
  );
}

/** /tickets/:id — the check-in code, the payment step for a paid ticket, and the registration's state. */
export function TicketPage() {
  const { t } = useWebT();
  const { id = '' } = useParams();
  return (
    <SignedInGate body={t('liteWeb.tickets.gate')}>
      <TicketLoader id={id} />
    </SignedInGate>
  );
}
