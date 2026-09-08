import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import type { DocumentNode } from 'graphql';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n';
import type { RegionHostPod } from '../queries';

interface Props {
  /** REGION_HOST_PODS or REGION_CLUB_PODS — the row shape is the same. */
  document: DocumentNode;
  /** Root field on the response, and the variable that scopes it. */
  rootField: string;
  variables: Record<string, string>;
  /** Refetch key: the id the table is scoped to. */
  scopeKey: string;
  currency: string;
  emptyText: string;
  /** A pod row opens its full detail page. */
  onOpenPod: (podDocId: string) => void;
}

const getRowId = (row: RegionHostPod) => row.id;
const ACTIVE_COLORS = { ON: 'success', OFF: 'default' } as const;

/**
 * The pods table, used by BOTH drill-down paths.
 *
 * A host's pods and a club's pods are the same rows read through two
 * server-side scopes, so they are one component with the document passed in —
 * two copies is how the two lists end up with different columns and only one of
 * them sortable (rule 34).
 */
export default function RegionPodsTable({
  document,
  rootField,
  variables,
  scopeKey,
  currency,
  emptyText,
  onOpenPod,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<RegionHostPod>(
    client,
    document,
    rootField,
    { extraVariables: variables },
    [scopeKey],
  );

  const columns = useMemo<DuncitColumn<RegionHostPod>[]>(() => {
    const renderPod = (row: RegionHostPod) => (
      <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
        <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
          {row.pod_title}
        </Typography>
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {row.pod_id}
        </Typography>
      </Stack>
    );
    const renderActive = (row: RegionHostPod) => (
      <StatusChip
        status={row.is_active ? 'ON' : 'OFF'}
        colorMap={ACTIVE_COLORS}
        label={row.is_active ? t('partners.regional.podLive') : t('partners.regional.podOff')}
      />
    );
    return [
      {
        field: 'pod_title',
        headerName: t('partners.regional.pod'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (row) => row.pod_title,
      },
      dateColumn<RegionHostPod>({
        field: 'pod_date_time',
        headerName: t('partners.regional.when'),
        hide: false,
        width: 130,
      }),
      {
        field: 'club_name',
        headerName: t('partners.regional.club'),
        minWidth: 150,
        sortable: false,
        valueGetter: (row) => row.club_name,
      },
      {
        field: 'pod_amount',
        headerName: t('partners.regional.price'),
        width: 110,
        filter: { type: 'number' },
        valueGetter: (row) =>
          formatMoney(row.pod_amount, { symbol: currency, decimals: 2, grouping: false }),
      },
      {
        field: 'no_of_spots',
        headerName: t('partners.regional.spots'),
        width: 100,
        valueGetter: (row) => row.no_of_spots,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 120,
        sortable: false,
        cellRenderer: renderActive,
        valueGetter: (row) => (row.is_active ? 1 : 0),
      },
    ];
  }, [t, currency]);

  return (
    <DuncitTable<RegionHostPod>
      tableId={`regional-pods-${rootField}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={emptyText}
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('partners.regional.searchPods')}
      onRowClick={(row) => onOpenPod(row.id)}
    />
  );
}
