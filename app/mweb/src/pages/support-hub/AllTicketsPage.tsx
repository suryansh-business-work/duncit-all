import { useQuery } from '@apollo/client';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import { formatDistanceToNowStrict } from 'date-fns';
import SupportShell from './SupportShell';
import { MY_UNIFIED_SUPPORT_TICKETS } from './queries';

interface UnifiedTicket {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  source: 'TICKET' | 'SOS' | 'CALLBACK' | 'CHAT';
  created_at: string;
}

const SOURCE_LABEL: Record<UnifiedTicket['source'], string> = {
  TICKET: 'Support Ticket',
  SOS: 'SOS',
  CALLBACK: 'Callback Request',
  CHAT: 'Chat with Us',
};

const SOURCE_COLOR: Record<UnifiedTicket['source'], 'error' | 'info' | 'success' | 'secondary'> = {
  SOS: 'error',
  CALLBACK: 'info',
  CHAT: 'success',
  TICKET: 'secondary',
};

/** Where a row should take the user when tapped (only tickets + chat have pages). */
function targetFor(row: UnifiedTicket): string | null {
  if (row.source === 'TICKET') return `/tickets/${row.id}`;
  if (row.source === 'CHAT') return '/live-chat';
  return null;
}

/** One list of every support request the user has raised — current + historical
 * across SOS, callbacks, support tickets and chat, with prefixed ticket ids. */
export default function AllTicketsPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ myUnifiedSupportTickets: UnifiedTicket[] }>(
    MY_UNIFIED_SUPPORT_TICKETS,
    { fetchPolicy: 'cache-and-network' }
  );
  const rows = data?.myUnifiedSupportTickets ?? [];

  let body: React.ReactNode;
  if (loading && rows.length === 0) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
        <CircularProgress size={28} />
      </Box>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (rows.length === 0) {
    body = <Alert severity="info">You have not raised any support requests yet.</Alert>;
  } else {
    body = (
      <Stack spacing={1.25}>
        {rows.map((row) => {
          const target = targetFor(row);
          return (
            <Paper
              key={`${row.source}-${row.id}`}
              variant="outlined"
              onClick={() => target && navigate(target)}
              sx={{ p: 1.5, borderRadius: 3, cursor: target ? 'pointer' : 'default' }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>
                      {row.ticket_no}
                    </Typography>
                    <Chip size="small" label={SOURCE_LABEL[row.source]} color={SOURCE_COLOR[row.source]} variant="outlined" />
                  </Stack>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                    {row.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNowStrict(new Date(row.created_at))} ago
                  </Typography>
                </Box>
                <Chip size="small" label={row.status} sx={{ fontWeight: 800 }} />
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    );
  }

  return (
    <SupportShell
      title="All Support Tickets"
      subtitle="Every request you have raised, in one list"
      icon={<HistoryIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #7c5cff 0%, #b388ff 100%)"
      backTo="/support"
    >
      {body}
    </SupportShell>
  );
}
