import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ForumIcon from '@mui/icons-material/Forum';
import SensorsIcon from '@mui/icons-material/Sensors';
import { formatDistanceToNow } from 'date-fns';
import SupportShell from './SupportShell';
import CreateTicketDialog from './CreateTicketDialog';
import { MY_TICKETS, type TicketListItem, type TicketStatus } from '../support-tickets/queries';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

export default function LiveTicketsPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ myTickets: TicketListItem[] }>(MY_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });
  const items = data?.myTickets ?? [];
  const [open, setOpen] = useState(false);

  const handleCreated = (id?: string) => {
    if (id) navigate(`/tickets/${id}`);
    else refetch();
  };

  return (
    <SupportShell
      title="Live Tickets"
      subtitle="Track your open tickets live"
      icon={<SensorsIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #4caf50 0%, #2196f3 100%)"
      backTo="/support"
      action={
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          New
        </Button>
      }
    >
      <Stack spacing={1.5}>
        <Paper
          onClick={() => navigate('/live-chat')}
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 4,
            bgcolor: 'rgba(33,150,243,0.08)',
            cursor: 'pointer',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <ForumIcon color="primary" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                Chat live with an agent
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Get real-time answers without raising a ticket.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {loading && !items.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : !items.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            You haven't raised any tickets yet.
          </Typography>
        ) : (
          items.map((t) => (
            <Paper
              key={t.id}
              variant="outlined"
              onClick={() => navigate(`/tickets/${t.id}`)}
              sx={{ p: 1.75, borderRadius: 3, cursor: 'pointer' }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                    {t.subject}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.category} ·{' '}
                    {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                  </Typography>
                </Box>
                <Chip size="small" color={STATUS_COLOR[t.status]} label={t.status} />
              </Stack>
            </Paper>
          ))
        )}
      </Stack>

      <CreateTicketDialog open={open} onClose={() => setOpen(false)} onCreated={handleCreated} />
    </SupportShell>
  );
}
