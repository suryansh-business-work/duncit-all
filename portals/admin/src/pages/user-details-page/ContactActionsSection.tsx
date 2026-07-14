import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Chip, IconButton, Link, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DuncitTable,
  tableQueryToGql,
  type DuncitColumn,
  type TableFetch,
  type TableQueryState,
} from '@duncit/table';
import { notifyError } from '../../components/notify';
import {
  DELETE_USER_CONTACT_ACTION,
  USER_CONTACT_ACTIONS_TABLE,
  type ContactActionRow,
} from './queries';

interface Props {
  userId: string;
  refreshToken: number;
}

const TYPE_OPTIONS = [
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
];

const getActionRowId = (a: ContactActionRow) => a.id;

const renderType = (a: ContactActionRow) => (
  <Chip size="small" label={a.type} color={a.type === 'CALL' ? 'primary' : 'secondary'} />
);

const renderNotes = (a: ContactActionRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    {a.subject && (
      <Typography variant="caption" component="span">
        {a.subject}
      </Typography>
    )}
    {a.notes && (
      <Typography variant="caption" color="text.secondary" component="span">
        {a.notes}
      </Typography>
    )}
    {a.recording_url && (
      <Link variant="caption" href={a.recording_url} target="_blank" rel="noreferrer">
        Recording
      </Link>
    )}
  </Stack>
);

const notesValue = (a: ContactActionRow) => [a.subject, a.notes].filter(Boolean).join(' — ');

const whenValue = (a: ContactActionRow) =>
  `${new Date(a.created_at).toLocaleString()}${a.duration_seconds ? ` (${a.duration_seconds}s)` : ''}`;

export default function ContactActionsSection({ userId, refreshToken }: Readonly<Props>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deleteAction] = useMutation(DELETE_USER_CONTACT_ACTION);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      if (!userId) return { rows: [], total: 0 };
      const { data } = await client.query({
        query: USER_CONTACT_ACTIONS_TABLE,
        variables: { user_id: userId, ...tableQueryToGql(q) },
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.userContactActionsTable.rows as ContactActionRow[],
        total: data.userContactActionsTable.total as number,
      };
    },
    [client, userId],
  );

  // Parent bumps refreshToken after logging a new call/email via ContactActionDialog.
  useEffect(() => {
    if (refreshToken) refetchRef.current?.();
  }, [refreshToken]);

  const columns = useMemo<DuncitColumn<ContactActionRow>[]>(() => {
    const remove = async (a: ContactActionRow) => {
      try {
        await deleteAction({ variables: { action_id: a.id } });
        refetchRef.current?.();
      } catch (e: any) {
        notifyError(e.message ?? 'Could not delete contact log');
      }
    };
    const renderActions = (a: ContactActionRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <IconButton size="small" color="error" onClick={() => remove(a)} aria-label="delete contact log">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
    return [
      {
        field: 'type',
        headerName: 'Type',
        filter: { type: 'select', options: TYPE_OPTIONS },
        width: 110,
        cellRenderer: renderType,
        valueGetter: (a) => a.type,
      },
      { field: 'target', headerName: 'Target', flex: 1, minWidth: 160 },
      { field: 'status', headerName: 'Status', filter: { type: 'text' }, minWidth: 130 },
      {
        field: 'notes',
        headerName: 'Notes',
        sortable: false,
        flex: 2,
        minWidth: 240,
        cellRenderer: renderNotes,
        valueGetter: notesValue,
      },
      {
        field: 'created_at',
        headerName: 'When',
        filter: { type: 'date' },
        minWidth: 190,
        valueGetter: whenValue,
      },
      {
        field: 'duration_seconds',
        headerName: 'Duration (s)',
        filter: { type: 'number' },
        hide: true,
        width: 120,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 90, cellRenderer: renderActions },
    ];
  }, [deleteAction]);

  return (
    <Stack spacing={2}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" fontWeight={700}>
          Call &amp; Email Logs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Filter user outreach by type, status, or notes.
        </Typography>
      </Stack>
      <DuncitTable<ContactActionRow>
        tableId="admin-user-contact-actions"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getActionRowId}
        emptyText="No contact logs yet."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search target, subject or notes"
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
