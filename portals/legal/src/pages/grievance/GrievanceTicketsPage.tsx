import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { GRIEVANCE_TICKETS_TABLE, type GrievanceTicket } from '../../graphql/grievance';
import GrievanceTicketsTable from './GrievanceTicketsTable';
import GrievanceDetailDialog from './GrievanceDetailDialog';

export default function GrievanceTicketsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Admin-configured format and time zone, so "Received" reads the same here
  // as it does everywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  const fetchRows = useApolloTableFetch<GrievanceTicket>(
    client,
    GRIEVANCE_TICKETS_TABLE,
    'grievanceTicketsTable',
  );

  const [open, setOpen] = useState<GrievanceTicket | null>(null);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Grievance Tickets"
        subtitle="Every grievance raised from the app, the website and this portal — each with its own reference number."
      />

      <GrievanceTicketsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onOpen={setOpen}
      />

      <GrievanceDetailDialog
        ticket={open}
        formatDateTime={formatDateTime}
        onClose={() => setOpen(null)}
        onSaved={() => {
          notifySuccess('Grievance updated');
          refetchRef.current?.();
        }}
      />
    </Stack>
  );
}
