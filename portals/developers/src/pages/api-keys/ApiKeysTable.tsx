import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, formatDateCell, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ApiKeyRow } from './queries';

/** The `t` a helper below receives — the shell hook's translate function. */
type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  fetchRows: TableFetch<ApiKeyRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onRevoke: (key: ApiKeyRow) => void;
}

const getApiKeyRowId = (k: ApiKeyRow) => k.id;

const fmtDate = (iso: string | null) => formatDateCell(iso, 'd MMM yyyy, h:mm a');

const createdValue = (k: ApiKeyRow) => fmtDate(k.created_at);
const lastUsedValue = (k: ApiKeyRow) => fmtDate(k.last_used_at);
const revokedValue = (k: ApiKeyRow) => fmtDate(k.revoked_at);
const scopesValue = (k: ApiKeyRow) => k.scopes.join(', ');

/** Revoked/Active reads from the catalogue, so the cell and the exported value
 * are the same sentence in whatever language the reader is in. */
const statusValue = (k: ApiKeyRow, t: Translate) =>
  k.revoked_at ? t('developers.apiKeys.statusRevoked') : t('developers.apiKeys.statusActive');

const renderKey = (k: ApiKeyRow) => (
  <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
    {k.key_prefix}…
  </Typography>
);

const renderScopes = (k: ApiKeyRow) => (
  <Stack direction="row" spacing={0.5} useFlexGap component="span" sx={{
    flexWrap: "wrap"
  }}>
    {k.scopes.map((scope) => (
      <Chip key={scope} size="small" label={scope} />
    ))}
  </Stack>
);

export default function ApiKeysTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onRevoke,
}: Readonly<Props>) {
  const { t } = useTranslation();

  // Columns depend on the active catalogue, so they are rebuilt when it
  // changes rather than frozen at module load — the headers have to follow it.
  const columns = useMemo<DuncitColumn<ApiKeyRow>[]>(() => {
    const renderActions = (k: ApiKeyRow) =>
      k.revoked_at ? null : (
        <Button size="small" color="error" onClick={() => onRevoke(k)}>
          {t('developers.apiKeys.revoke')}
        </Button>
      );
    const renderStatus = (k: ApiKeyRow) => (
      <Chip size="small" color={k.revoked_at ? 'default' : 'success'} label={statusValue(k, t)} />
    );
    return [
      {
        field: 'name',
        headerName: t('developers.apiKeys.colName'),
        flex: 1,
        minWidth: 160,
        filter: { type: 'text' },
      },
      {
        field: 'key_prefix',
        headerName: t('developers.apiKeys.colKey'),
        minWidth: 140,
        filter: { type: 'text' },
        cellRenderer: renderKey,
        valueGetter: (k) => k.key_prefix,
      },
      {
        field: 'scopes',
        headerName: t('developers.apiKeys.colScopes'),
        sortable: false,
        minWidth: 160,
        cellRenderer: renderScopes,
        valueGetter: scopesValue,
      },
      {
        field: 'created_at',
        headerName: t('developers.apiKeys.colCreated'),
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: createdValue,
      },
      {
        field: 'last_used_at',
        headerName: t('developers.apiKeys.colLastUsed'),
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: lastUsedValue,
      },
      {
        field: 'status',
        headerName: t('developers.apiKeys.colStatus'),
        sortable: false,
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (k) => statusValue(k, t),
      },
      {
        field: 'revoked_at',
        headerName: t('developers.apiKeys.colRevokedAt'),
        filter: { type: 'date' },
        hide: true,
        minWidth: 180,
        valueGetter: revokedValue,
      },
      { field: 'actions', headerName: '', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onRevoke, t]);

  return (
    <DuncitTable<ApiKeyRow>
      tableId="developers-api-keys"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getApiKeyRowId}
      toolbarActions={toolbarActions}
      emptyText={t('developers.apiKeys.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('developers.apiKeys.search')}
      refetchRef={refetchRef}
    />
  );
}
