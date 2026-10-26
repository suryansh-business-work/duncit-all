import LinkOffIcon from '@mui/icons-material/LinkOff';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { StatusChip } from '@duncit/ui';
import { accessLabel, CONNECTION_STATUS, vocabularyColors, vocabularyLabel } from '../../lib/labels';
import type { ConnectionRow } from './queries';

interface ConnectionColumnOptions {
  t: Translate;
  formatDateTime: (date: Date) => string;
  /** Managers see everyone's connections, so they get a Person column. */
  manager: boolean;
  /** A connector's name from its URL (the token's resource). */
  connectorLabel: (resource: string) => string;
  onRevoke: (row: ConnectionRow) => void;
}

const STATUS_COLORS = vocabularyColors(CONNECTION_STATUS);

/**
 * The Connections table. Sort and filter flags follow the server's table config
 * (connections.service CONNECTION_TABLE); status is worked out per row from
 * the dates, so it can be read but not sorted or filtered on.
 */
export function buildConnectionColumns(options: ConnectionColumnOptions): DuncitColumn<ConnectionRow>[] {
  const { t, formatDateTime, manager, connectorLabel, onRevoke } = options;
  const person: DuncitColumn<ConnectionRow>[] = manager
    ? [
        {
          field: 'user_email',
          headerName: t('mcp.connections.columnPerson'),
          type: 'text',
          minWidth: 200,
          valueGetter: (row) => row.user_email ?? t('mcp.common.unknown'),
        },
      ]
    : [];
  return [
    { field: 'client_name', headerName: t('mcp.connections.columnApp'), type: 'text', flex: 1, minWidth: 180 },
    ...person,
    {
      field: 'scopes',
      headerName: t('mcp.connections.columnAccess'),
      type: 'text',
      width: 140,
      sortable: false,
      filterable: false,
      valueGetter: (row) => accessLabel(row.scopes, t),
    },
    {
      field: 'resource',
      headerName: t('mcp.connections.columnConnector'),
      type: 'text',
      minWidth: 200,
      sortable: false,
      filterable: false,
      valueGetter: (row) => connectorLabel(row.resource),
    },
    {
      field: 'status',
      headerName: t('mcp.connections.columnStatus'),
      type: 'text',
      width: 120,
      sortable: false,
      filterable: false,
      valueGetter: (row) => vocabularyLabel(CONNECTION_STATUS, row.status, t),
      cellRenderer: (row) => (
        <StatusChip status={row.status} colorMap={STATUS_COLORS} label={vocabularyLabel(CONNECTION_STATUS, row.status, t)} />
      ),
    },
    dateColumn<ConnectionRow>({
      field: 'created_at',
      headerName: t('mcp.connections.columnCreated'),
      hide: false,
      width: 180,
      formatDate: formatDateTime,
    }),
    dateColumn<ConnectionRow>({
      field: 'last_used_at',
      headerName: t('mcp.connections.columnLastUsed'),
      hide: false,
      width: 180,
      formatDate: formatDateTime,
    }),
    {
      field: 'last_ip',
      headerName: t('mcp.connections.columnLastIp'),
      type: 'text',
      width: 150,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.last_ip ?? EM_DASH,
    },
    actionsColumn<ConnectionRow>({
      onDelete: onRevoke,
      delete: {
        title: (row) => t('mcp.connections.revokeNamed', { vars: { app: row.client_name } }),
        icon: <LinkOffIcon fontSize="small" />,
        disabled: (row) => row.status !== 'ACTIVE',
        disabledTitle: t('mcp.connections.alreadyEnded'),
      },
    }),
  ];
}
