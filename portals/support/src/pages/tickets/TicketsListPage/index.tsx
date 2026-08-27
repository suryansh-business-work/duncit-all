import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import type { TableQueryState } from '@duncit/table';
import { TICKETS, type TicketPage, type TicketPriority } from '../../../graphql/tickets';
import { useSupportSocket } from '../../../lib/useSupportSocket';
import { supportListVars } from '../../../lib/supportTable';
import TicketsTable from './TicketsTable';
import NewTicketDialog from './NewTicketDialog';
import { useTranslation } from '@duncit/shell';

const SORT_OPTIONS: ReadonlyArray<{ value: TicketPriority; labelKey: string }> = [
  { value: 'HIGH', labelKey: 'support.tickets.priorityHigh' },
  { value: 'MEDIUM', labelKey: 'support.tickets.priorityMedium' },
  { value: 'LOW', labelKey: 'support.tickets.priorityLow' },
];

export default function TicketsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  // Display order only — the selected priority lists first; ticket priorities
  // are never modified. Threaded to the query via the table's externalFilters.
  const [priorityFirst, setPriorityFirst] = useState<TicketPriority>('HIGH');

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
      <PageHeader
        title={t('support.tickets.title')}
        subtitle={t('support.tickets.subtitle')}
      />

      <TicketsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        externalFilters={[{ field: 'priority_first', op: 'eq', value: priorityFirst }]}
        toolbarActions={
          <>
            <TextField
              select
              size="small"
              label={t('support.tickets.sort')}
              value={priorityFirst}
              onChange={(e) => setPriorityFirst(e.target.value as TicketPriority)}
              sx={{ minWidth: 120 }}
            >
              {SORT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </MenuItem>
              ))}
            </TextField>
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
              {t('support.tickets.create')}
            </DuncitButton>
          </>
        }
        onRowClick={(t) => navigate(`/tickets/${t.id}`)}
      />

      <NewTicketDialog open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </Stack>
  );
}
