import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ApiKeyRow } from './queries';

interface Props {
  fetchRows: TableFetch<ApiKeyRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onRevoke: (key: ApiKeyRow) => void;
}

const getApiKeyRowId = (k: ApiKeyRow) => k.id;

const fmtDate = (iso: string | null) => (iso ? format(new Date(iso), 'd MMM yyyy, h:mm a') : '—');

const createdValue = (k: ApiKeyRow) => fmtDate(k.created_at);
const lastUsedValue = (k: ApiKeyRow) => fmtDate(k.last_used_at);
const revokedValue = (k: ApiKeyRow) => fmtDate(k.revoked_at);
const scopesValue = (k: ApiKeyRow) => k.scopes.join(', ');
const statusValue = (k: ApiKeyRow) => (k.revoked_at ? 'Revoked' : 'Active');

const renderKey = (k: ApiKeyRow) => (
  <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
    {k.key_prefix}…
  </Typography>
);

const renderScopes = (k: ApiKeyRow) => (
  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap component="span">
    {k.scopes.map((scope) => (
      <Chip key={scope} size="small" label={scope} />
    ))}
  </Stack>
);

const renderStatus = (k: ApiKeyRow) => (
  <Chip
    size="small"
    color={k.revoked_at ? 'default' : 'success'}
    label={statusValue(k)}
  />
);

export default function ApiKeysTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onRevoke,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<ApiKeyRow>[]>(() => {
    const renderActions = (k: ApiKeyRow) =>
      k.revoked_at ? null : (
        <Button size="small" color="error" onClick={() => onRevoke(k)}>
          Revoke
        </Button>
      );
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160, filter: { type: 'text' } },
      {
        field: 'key_prefix',
        headerName: 'Key',
        minWidth: 140,
        filter: { type: 'text' },
        cellRenderer: renderKey,
        valueGetter: (k) => k.key_prefix,
      },
      {
        field: 'scopes',
        headerName: 'Scopes',
        sortable: false,
        minWidth: 160,
        cellRenderer: renderScopes,
        valueGetter: scopesValue,
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: createdValue,
      },
      {
        field: 'last_used_at',
        headerName: 'Last used',
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: lastUsedValue,
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: false,
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
      {
        field: 'revoked_at',
        headerName: 'Revoked at',
        filter: { type: 'date' },
        hide: true,
        minWidth: 180,
        valueGetter: revokedValue,
      },
      { field: 'actions', headerName: '', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onRevoke]);

  return (
    <DuncitTable<ApiKeyRow>
      tableId="developers-api-keys"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getApiKeyRowId}
      toolbarActions={toolbarActions}
      emptyText="No API keys yet — create one to start calling the venue APIs."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name or key prefix"
      refetchRef={refetchRef}
    />
  );
}
