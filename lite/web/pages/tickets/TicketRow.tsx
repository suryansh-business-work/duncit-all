import { Link as RouterLink } from 'react-router';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { eventWhen } from '../../../shared/format';
import { useWebT } from '../../../shared/i18n';
import { LiteImage } from '../../components/LiteImage';
import { PaymentStatusChip, RegistrationStatusChip } from '../../components/StatusChips';
import type { LiteTicket } from '../../graphql/registrations';
import { paths } from '../../lib/paths';

/** One registration in the reader's list: the event, when, and where the ticket stands. */
export function TicketRow({ ticket }: Readonly<{ ticket: LiteTicket }>) {
  const { t } = useWebT();
  const when = eventWhen(ticket.event.start_at, ticket.event.end_at, ticket.event.timezone);
  return (
    <ButtonBase
      component={RouterLink}
      to={paths.ticket(ticket.id)}
      sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider', p: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
      data-testid="ticket-row"
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
        <Box sx={{ width: 72, flexShrink: 0 }}>
          <LiteImage src={ticket.event.cover_url} alt="" width={72} height={72} sx={{ borderRadius: 2 }} />
        </Box>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }} spacing={0.25}>
          <Typography sx={{ fontWeight: 800 }} noWrap>
            {ticket.event.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {when.date} · {when.time}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {t('liteWeb.tickets.summary', { vars: { ticket: ticket.ticket.name, quantity: ticket.quantity, code: ticket.code } })}
          </Typography>
        </Stack>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <RegistrationStatusChip status={ticket.status} />
          {ticket.payment_status === 'NOT_REQUIRED' ? null : <PaymentStatusChip status={ticket.payment_status} />}
        </Stack>
      </Stack>
    </ButtonBase>
  );
}
