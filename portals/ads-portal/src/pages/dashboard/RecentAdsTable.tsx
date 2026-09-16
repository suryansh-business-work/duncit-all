import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  AD_STATUS_COLORS,
  adPositionLabel,
  adPositionOptions,
  adStatusOptions,
  formatAdCost,
} from '../ads/ad-options';
import { MY_ADS_TABLE, type AdRequestRow } from '../ads/queries';

const getAdRowId = (row: AdRequestRow) => row.id;

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_COLORS} />
);

/** Compact preview of the advertiser's latest requests, reusing myAdRequestsTable. */
export default function RecentAdsTable() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fetchRows = useApolloTableFetch<AdRequestRow>(client, MY_ADS_TABLE, 'myAdRequestsTable');

  // A trimmed My Ads column set. Built per translator rather than frozen at
  // module load: the headers have to follow the active catalogue.
  const columns = useMemo<DuncitColumn<AdRequestRow>[]>(
    () => [
      {
        field: 'trace_id',
        headerName: t('ads.myAds.colTraceId'),
        type: 'text',
        minWidth: 130,
        valueGetter: (row) => row.trace_id,
      },
      {
        field: 'ad_title',
        headerName: t('ads.myAds.colTitle'),
        type: 'text',
        flex: 1,
        minWidth: 180,
        valueGetter: (row) => row.ad_title,
      },
      {
        field: 'position',
        headerName: t('ads.myAds.colPosition'),
        type: 'enum',
        options: adPositionOptions(t),
        minWidth: 150,
        valueGetter: (row) => adPositionLabel(row.position, t),
      },
      dateColumn<AdRequestRow>({
        field: 'start_at',
        headerName: t('ads.myAds.colStarts'),
        hide: false,
        width: 130,
      }),
      {
        field: 'estimated_cost',
        headerName: t('ads.myAds.colEstimatedCost'),
        type: 'number',
        width: 120,
        valueGetter: (row) => formatAdCost(row.estimated_cost, row.currency_symbol),
      },
      {
        field: 'status',
        headerName: t('ads.myAds.colStatus'),
        type: 'enum',
        options: adStatusOptions(t),
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
    ],
    [t],
  );

  return (
    <DuncitTable<AdRequestRow>
      tableId="ads-dashboard-recent"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getAdRowId}
      onRowClick={(row) => navigate(`/ads/${row.id}`)}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      emptyText={t('ads.myAds.empty')}
      searchPlaceholder={t('ads.myAds.recentSearch')}
    />
  );
}
