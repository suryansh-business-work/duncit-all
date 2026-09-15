import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, CardActionArea, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { formatDistanceToNow } from 'date-fns';
import { MY_TICKETS, type TicketListItem, type TicketStatus } from './queries';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

type Filter = 'ALL' | TicketStatus;
const FILTERS: Filter[] = ['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const LABEL: Record<Filter, string> = {
  ALL: 'All',
  OPEN: 'Open',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/** Short, stable ticket number derived from the id — matches the server's ST- scheme. */
function ticketNo(id: string): string {
  return `ST-${id.slice(-6).toUpperCase()}`;
}

export default function MyTicketsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ myTickets: TicketListItem[] }>(MY_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });
  const all = data?.myTickets ?? [];

  const countFor = (f: Filter): number =>
    f === 'ALL' ? all.length : all.filter((ticket) => ticket.status === f).length;

  const tabs = useTabParam<Filter>({
    items: FILTERS.map((f) => ({
      value: f,
      label: `${LABEL[f]} (${countFor(f)})`,
      sx: { fontWeight: 600 },
      testId: `tickets-filter-${f}`,
    })),
    fallback: 'ALL',
  });
  const filter = tabs.value;
  const items = filter === 'ALL' ? all : all.filter((ticket) => ticket.status === filter);

  const emptyOrList =
    items.length === 0 ? (
      <Typography
        data-testid="my-tickets-empty"
        variant="body2"
        sx={{
          color: "text.secondary",
          p: 1.5
        }}>
        {filter === 'ALL' ? "You haven't raised any tickets yet." : `No ${LABEL[filter].toLowerCase()} tickets.`}
      </Typography>
    ) : (
      <Paper sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
        {items.map((ticket, index) => (
          <CardActionArea
            key={ticket.id}
            data-testid={`my-ticket-${ticket.id}`}
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            sx={{ px: 2, py: 1.75, borderRadius: 0, borderTop: index === 0 ? 0 : 1, borderColor: 'divider' }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                justifyContent: "space-between"
              }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }} noWrap>
                  {ticket.subject}
                </Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {ticketNo(ticket.id)} · {ticket.category} ·{' '}
                  {formatDistanceToNow(new Date(ticket.last_message_at), { addSuffix: true })}
                </Typography>
              </Box>
              <Chip size="small" color={STATUS_COLOR[ticket.status]} label={LABEL[ticket.status]} />
            </Stack>
          </CardActionArea>
        ))}
      </Paper>
    );

  return (
    <Stack data-testid="my-tickets-list" spacing={1}>
      <SectionHeader testId="my-tickets-header" title="Your tickets" />
      <DuncitTabs
        {...tabs}
        variant="scrollable"
        scrollButtons={false}
        sx={{ minHeight: 36, mb: 1, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
      />

      {loading && all.length === 0 ? (
        <Box data-testid="my-tickets-loading" sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress aria-label={t('mweb.a11y.loading')} size={22} />
        </Box>
      ) : (
        emptyOrList
      )}
    </Stack>
  );
}
