import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { MY_TICKETS, type TicketListItem, type TicketStatus } from './queries';

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
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ myTickets: TicketListItem[] }>(MY_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });
  const [filter, setFilter] = useState<Filter>('ALL');

  const all = data?.myTickets ?? [];
  const items = filter === 'ALL' ? all : all.filter((t) => t.status === filter);

  const countFor = (f: Filter): number =>
    f === 'ALL' ? all.length : all.filter((t) => t.status === f).length;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 950 }}>
        Your tickets
      </Typography>
      <Tabs
        value={filter}
        onChange={(_e, v) => setFilter(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{ minHeight: 36, mb: 1, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
      >
        {FILTERS.map((f) => (
          <Tab key={f} value={f} label={`${LABEL[f]} (${countFor(f)})`} sx={{ fontWeight: 800 }} />
        ))}
      </Tabs>

      {loading && all.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={22} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
          {filter === 'ALL' ? "You haven't raised any tickets yet." : `No ${LABEL[filter].toLowerCase()} tickets.`}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {items.map((t) => (
            <Paper
              key={t.id}
              variant="outlined"
              onClick={() => navigate(`/tickets/${t.id}`)}
              sx={{ p: 1.5, borderRadius: 3, cursor: 'pointer' }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                    {t.subject}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ticketNo(t.id)} · {t.category} ·{' '}
                    {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                  </Typography>
                </Box>
                <Chip size="small" color={STATUS_COLOR[t.status]} label={LABEL[t.status]} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
