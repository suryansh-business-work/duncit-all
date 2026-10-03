import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { CloudflareCompareRow, CloudflareRowState } from '@duncit/gql-types';
import { ROW_LABEL_KEY, ROW_TONE } from './rowState';

type Translate = ReturnType<typeof useTranslation>['t'];

const EM_DASH = '—';
const MONO = { fontFamily: 'monospace', wordBreak: 'break-all', py: 0.5 } as const;

const getRowId = (row: CloudflareCompareRow) => row.id;
const searchOf = (row: CloudflareCompareRow) =>
  `${row.type} ${row.host} ${row.godaddy_value ?? ''} ${row.cloudflare_value ?? ''}`;

/** One provider's value, or a dash when that provider holds nothing here — red when that is what breaks. */
function ValueCell({ value, missing }: Readonly<{ value?: string | null; missing: boolean }>) {
  return (
    <Typography
      variant="body2"
      sx={value ? MONO : { ...MONO, fontWeight: 700, color: missing ? 'error.main' : 'text.secondary' }}
    >
      {value ?? EM_DASH}
    </Typography>
  );
}

function CloudflareCell({ row, t }: Readonly<{ row: CloudflareCompareRow; t: Translate }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <ValueCell value={row.cloudflare_value} missing={row.state === 'GODADDY_ONLY'} />
      {row.proxied && <Chip size="small" color="warning" variant="outlined" label={t('tech.cloudflare.proxied')} />}
    </Stack>
  );
}

const renderState = (state: CloudflareRowState, t: Translate) => (
  <Chip size="small" color={ROW_TONE[state]} label={t(ROW_LABEL_KEY[state])} />
);

interface Props {
  rows: CloudflareCompareRow[];
  busy: boolean;
  onCopy: (rows: CloudflareCompareRow[]) => void;
  onDelete: (row: CloudflareCompareRow) => void;
  toolbarActions: ReactNode;
}

/**
 * GoDaddy on the left, Cloudflare on the right, one line per record. A record
 * that is on GoDaddy only is tinted red: it is what stops resolving if the
 * nameservers move now, and the arrow copies it across.
 */
export default function CompareTable({ rows, busy, onCopy, onDelete, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const refetchRef = useRef<(() => void) | null>(null);

  const getRowStyle = useCallback(
    (row: CloudflareCompareRow) =>
      row.state === 'BOTH' ? undefined : { backgroundColor: alpha(theme.palette[ROW_TONE[row.state]].main, 0.12) },
    [theme],
  );

  const states = useMemo(
    () =>
      (Object.keys(ROW_LABEL_KEY) as CloudflareRowState[]).map((state) => ({ value: state, label: t(ROW_LABEL_KEY[state]) })),
    [t],
  );

  const columns = useMemo<DuncitColumn<CloudflareCompareRow>[]>(
    () => [
      { field: 'type', headerName: t('shell.common.type'), width: 90, type: 'text' },
      { field: 'host', headerName: t('tech.cloudflare.colHost'), flex: 1, minWidth: 190, type: 'text' },
      {
        field: 'godaddy_value',
        headerName: t('tech.cloudflare.colGodaddy'),
        flex: 1,
        minWidth: 180,
        type: 'text',
        sortable: false,
        cellRenderer: (row) => <ValueCell value={row.godaddy_value} missing={false} />,
        valueGetter: (row) => row.godaddy_value ?? EM_DASH,
      },
      {
        field: 'cloudflare_value',
        headerName: t('tech.cloudflare.colCloudflare'),
        flex: 1,
        minWidth: 180,
        type: 'text',
        sortable: false,
        cellRenderer: (row) => <CloudflareCell row={row} t={t} />,
        valueGetter: (row) => row.cloudflare_value ?? EM_DASH,
      },
      { field: 'priority', headerName: t('tech.cloudflare.colPriority'), width: 100, type: 'number' },
      {
        field: 'state',
        headerName: t('shell.common.status'),
        width: 170,
        type: 'enum',
        options: states,
        cellRenderer: (row) => renderState(row.state, t),
        valueGetter: (row) => t(ROW_LABEL_KEY[row.state]),
      },
      actionsColumn<CloudflareCompareRow>({
        width: 110,
        renderExtra: (row) => <RowActions row={row} busy={busy} onCopy={onCopy} onDelete={onDelete} />,
      }),
    ],
    [busy, onCopy, onDelete, states, t],
  );

  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, columns]);

  return (
    <DuncitTable<CloudflareCompareRow>
      ariaLabel={t('tech.cloudflare.tableLabel')}
      tableId="tech-cloudflare-compare"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      getRowStyle={getRowStyle}
      toolbarActions={toolbarActions}
      emptyText={t('tech.cloudflare.empty')}
      searchPlaceholder={t('tech.cloudflare.searchPlaceholder')}
      defaultSort={{ field: 'host', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}

/** Copy a GoDaddy-only record across, or remove a record from Cloudflare. */
function RowActions({ row, busy, onCopy, onDelete }: Readonly<{
  row: CloudflareCompareRow;
  busy: boolean;
  onCopy: (rows: CloudflareCompareRow[]) => void;
  onDelete: (row: CloudflareCompareRow) => void;
}>) {
  const { t } = useTranslation();
  const copyTitle = row.copyable ? t('tech.cloudflare.copyRow', { vars: { host: row.host } }) : t('tech.cloudflare.nothingToCopy');
  const deleteTitle = t('tech.cloudflare.deleteRow', { vars: { host: row.host } });
  return (
    <>
      <Tooltip title={copyTitle}>
        <span>
          <DuncitIconButton
            size="small"
            color="primary"
            disabled={!row.copyable || busy}
            onClick={() => onCopy([row])}
            aria-label={copyTitle}
            data-testid={`cloudflare-copy-${row.id}`}
          >
            <ArrowForwardIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      {row.cloudflare_value !== null && (
        <Tooltip title={deleteTitle}>
          <span>
            <DuncitIconButton
              size="small"
              color="error"
              disabled={busy}
              onClick={() => onDelete(row)}
              aria-label={deleteTitle}
              data-testid={`cloudflare-delete-${row.id}`}
            >
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      )}
    </>
  );
}
