import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Chip, IconButton, Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitTable, tableQueryToGql, type DuncitColumn, type TableQueryState } from '@duncit/table';
import { useDateFormat } from '../../../utils/dateFormat';
import ContactDetailsDialog from './ContactDetailsDialog';
import {
  CONTACT_STATUS_COLOR,
  CONTACT_STATUSES,
  CONTACT_TABLE,
  UPDATE_CONTACT_STATUS,
  type ContactSubmission,
} from './queries';

const getContactRowId = (row: ContactSubmission) => row.id;

const STATUS_OPTIONS = CONTACT_STATUSES.map((status) => ({ value: status, label: status }));

const renderStatus = (row: ContactSubmission) => (
  <Chip size="small" label={row.status} color={CONTACT_STATUS_COLOR[row.status] || 'default'} />
);

export default function ContactSubmissionsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_CONTACT_STATUS, {
    onCompleted: () => refetchRef.current?.(),
  });
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState<ContactSubmission | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: CONTACT_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.contactSubmissionsTable.rows as ContactSubmission[],
        total: data.contactSubmissionsTable.total as number,
      };
    },
    [client],
  );

  const columns = useMemo<DuncitColumn<ContactSubmission>[]>(() => {
    const renderActions = (row: ContactSubmission) => (
      <IconButton size="small" onClick={() => setOpen(row)} aria-label="view">
        <VisibilityIcon fontSize="small" />
      </IconButton>
    );
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
      { field: 'email', headerName: 'Email', filter: { type: 'text' }, flex: 1, minWidth: 200 },
      {
        field: 'subject',
        headerName: 'Subject',
        flex: 1,
        minWidth: 160,
        valueGetter: (row) => row.subject || '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'created_at',
        headerName: 'Received',
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        width: 70,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDateTime]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Contact Submission
      </Typography>
      <DuncitTable<ContactSubmission>
        tableId="website-contact-submissions"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getContactRowId}
        onRowClick={setOpen}
        emptyText="No submissions."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search name, email or subject"
        refetchRef={refetchRef}
      />
      <ContactDetailsDialog
        submission={open}
        onClose={() => setOpen(null)}
        onUpdateStatus={(id, s) => {
          updateStatus({ variables: { id, status: s } }).catch(() => undefined);
        }}
      />
    </Stack>
  );
}
