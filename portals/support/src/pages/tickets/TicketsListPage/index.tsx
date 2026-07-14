import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { TableQueryState } from '@duncit/table';
import { TICKETS, type TicketPage } from '../../../graphql/tickets';
import { useSupportSocket } from '../../../lib/useSupportSocket';
import { supportListVars } from '../../../lib/supportTable';
import TicketsTable from './TicketsTable';
import NewTicketDialog from './NewTicketDialog';

export default function TicketsListPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<{ tickets: TicketPage }>({
        query: TICKETS,
        variables: supportListVars(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.tickets.items, total: data.tickets.total };
    },
    [client]
  );

  useSupportSocket({
    onTicketNew: () => refetchRef.current?.(),
    onTicketUpdate: () => refetchRef.current?.(),
  });

  const onCreated = (id: string | null) => {
    setOpen(false);
    if (id) navigate(`/tickets/${id}`);
    else refetchRef.current?.();
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Tickets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Support tickets from users. Open one to reply, or raise a new ticket.
        </Typography>
      </Box>

      <TicketsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Ticket
          </Button>
        }
        onRowClick={(t) => navigate(`/tickets/${t.id}`)}
      />

      <NewTicketDialog open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </Stack>
  );
}
