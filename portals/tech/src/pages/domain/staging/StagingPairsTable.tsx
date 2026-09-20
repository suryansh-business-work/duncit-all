import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { DnsHostPair, DnsPairState } from '@duncit/gql-types';
import { PAIR_LABEL_KEY, PAIR_TONE, isFixableState } from './pairState';

type Translate = ReturnType<typeof useTranslation>['t'];

const EM_DASH = '—';
const MONO = { fontFamily: 'monospace', wordBreak: 'break-all', py: 0.5 } as const;

const getRowId = (row: DnsHostPair) => row.id;

const searchOf = (row: DnsHostPair) =>
  `${row.type} ${row.host} ${row.staging_host} ${row.production_values.join(' ')} ${row.staging_values.join(' ')}`;

/** A side's values, or an em-dash when that stack answers for nothing here. */
function ValueCell({ values, missing }: Readonly<{ values: string[]; missing: boolean }>) {
  if (values.length === 0) {
    return (
      <Typography variant="body2" sx={{ ...MONO, color: missing ? 'error.main' : 'text.secondary', fontWeight: 700 }}>
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Stack sx={{ py: 0.5 }}>
      {values.map((value) => (
        <Typography key={value} variant="body2" sx={MONO}>
          {value}
        </Typography>
      ))}
    </Stack>
  );
}

const renderHost = (host: string, name: string) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {name}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
      {host}
    </Typography>
  </Stack>
);

const renderState = (state: DnsPairState, t: Translate) => (
  <Chip size="small" color={PAIR_TONE[state]} label={t(PAIR_LABEL_KEY[state])} />
);

interface Props {
  pairs: DnsHostPair[];
  syncing: boolean;
  onSync: (pairs: DnsHostPair[]) => void;
  toolbarActions: ReactNode;
}

/**
 * Every host both stacks are compared on, with the mismatched ones tinted.
 *
 * The tint is on the ROW rather than only the state chip because the thing
 * being scanned for is "which line is wrong", and a page of green chips with
 * one red one reads faster than a column that has to be found first.
 */
export default function StagingPairsTable({ pairs, syncing, onSync, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const refetchRef = useRef<(() => void) | null>(null);

  const getRowStyle = useCallback(
    (row: DnsHostPair) => {
      if (row.state === 'MATCHED') return undefined;
      const tone = PAIR_TONE[row.state];
      return { backgroundColor: alpha(theme.palette[tone].main, 0.12) };
    },
    [theme],
  );

  const states = useMemo(
    () =>
      (Object.keys(PAIR_LABEL_KEY) as DnsPairState[]).map((state) => ({
        value: state,
        label: t(PAIR_LABEL_KEY[state]),
      })),
    [t],
  );

  const columns = useMemo<DuncitColumn<DnsHostPair>[]>(
    () => [
      { field: 'type', headerName: t('shell.common.type'), width: 100, type: 'text' },
      {
        field: 'host',
        headerName: t('tech.dnsStaging.colProductionHost'),
        flex: 1,
        minWidth: 190,
        type: 'text',
        cellRenderer: (row) => renderHost(row.host, row.name),
      },
      {
        field: 'production_values',
        headerName: t('tech.dnsStaging.colProductionValue'),
        flex: 1,
        minWidth: 160,
        type: 'text' as const,
        sortable: false,
        filterable: false,
        cellRenderer: (row) => <ValueCell values={row.production_values} missing={row.state === 'MISSING_PRODUCTION'} />,
        valueGetter: (row) => row.production_values.join(', ') || EM_DASH,
      },
      {
        field: 'staging_host',
        headerName: t('tech.dnsStaging.colStagingHost'),
        flex: 1,
        minWidth: 190,
        type: 'text',
        cellRenderer: (row) => renderHost(row.staging_host, row.staging_name),
      },
      {
        field: 'staging_values',
        headerName: t('tech.dnsStaging.colStagingValue'),
        flex: 1,
        minWidth: 160,
        type: 'text' as const,
        sortable: false,
        filterable: false,
        cellRenderer: (row) => <ValueCell values={row.staging_values} missing={row.state === 'MISSING_STAGING'} />,
        valueGetter: (row) => row.staging_values.join(', ') || EM_DASH,
      },
      {
        field: 'state',
        headerName: t('shell.common.status'),
        width: 170,
        type: 'enum',
        options: states,
        cellRenderer: (row) => renderState(row.state, t),
        valueGetter: (row) => t(PAIR_LABEL_KEY[row.state]),
      },
      actionsColumn<DnsHostPair>({
        width: 90,
        renderExtra: (row) => (
          <SyncRowButton row={row} syncing={syncing} onSync={onSync} />
        ),
      }),
    ],
    [onSync, states, syncing, t],
  );

  const fetchRows = useMemo(() => clientTableFetch(pairs, searchOf, columns), [pairs, columns]);

  return (
    <DuncitTable<DnsHostPair>
      ariaLabel={t('shell.nav.dnsStagingSync')}
      tableId="tech-dns-staging-pairs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      getRowStyle={getRowStyle}
      toolbarActions={toolbarActions}
      emptyText={t('tech.dnsStaging.empty')}
      searchPlaceholder={t('tech.dnsStaging.searchPlaceholder')}
      defaultSort={{ field: 'host', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}

/** Copy this one host's production values onto staging. */
function SyncRowButton({ row, syncing, onSync }: Readonly<{
  row: DnsHostPair;
  syncing: boolean;
  onSync: (pairs: DnsHostPair[]) => void;
}>) {
  const { t } = useTranslation();
  const fixable = row.fixable && isFixableState(row.state);
  let title = t('tech.dnsStaging.syncRow', { vars: { host: row.staging_host } });
  if (!fixable) {
    title = row.state === 'MATCHED' ? t('tech.dnsStaging.alreadyMatched') : t('tech.dnsStaging.nothingToCopy');
  }
  return (
    <Tooltip title={title}>
      <span>
        <DuncitIconButton
          size="small"
          color="primary"
          disabled={!fixable || syncing}
          onClick={() => onSync([row])}
          aria-label={title}
          data-testid={`dns-staging-sync-${row.id}`}
        >
          <SyncAltIcon fontSize="small" />
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}
