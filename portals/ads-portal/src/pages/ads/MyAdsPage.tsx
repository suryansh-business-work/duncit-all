import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { PageHeader, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  AD_STATUS_COLORS,
  adMediaTypeOptions,
  adPositionOptions,
  adStatusOptions,
  adPositionLabel,
  adTypeLabel,
  formatAdCost,
} from './ad-options';
import { MY_ADS_TABLE, type AdRequestRow } from './queries';

const getAdRowId = (row: AdRequestRow) => row.id;

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_COLORS} />
);

export default function MyAdsPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fetchRows = useApolloTableFetch<AdRequestRow>(client, MY_ADS_TABLE, 'myAdRequestsTable');

  // Rebuilt when the catalogue changes — a column set frozen at module load
  // would keep the language the console first rendered in.
  const columns = useMemo<DuncitColumn<AdRequestRow>[]>(
    () => [
      {
        field: 'trace_id',
        headerName: t('ads.myAds.colTraceId'),
        minWidth: 140,
        valueGetter: (row) => row.trace_id,
      },
      {
        field: 'ad_title',
        headerName: t('ads.myAds.colTitle'),
        flex: 1,
        minWidth: 180,
        valueGetter: (row) => row.ad_title,
      },
      {
        field: 'position',
        headerName: t('ads.myAds.colPosition'),
        minWidth: 170,
        filter: { type: 'select', options: adPositionOptions(t) },
        valueGetter: (row) => adPositionLabel(row.position, t),
      },
      {
        field: 'ad_type',
        headerName: t('ads.myAds.colType'),
        width: 100,
        sortable: false,
        filter: { type: 'select', options: adMediaTypeOptions(t) },
        valueGetter: (row) => adTypeLabel(row.ad_type, t),
      },
      dateColumn<AdRequestRow>({
        field: 'start_at',
        headerName: t('ads.myAds.colStarts'),
        hide: false,
        width: 130,
      }),
      {
        field: 'duration_days',
        headerName: t('ads.myAds.colDays'),
        width: 90,
        valueGetter: (row) => row.duration_days,
      },
      {
        field: 'estimated_cost',
        headerName: t('ads.myAds.colEstimatedCost'),
        width: 120,
        valueGetter: (row) => formatAdCost(row.estimated_cost, row.currency_symbol),
      },
      {
        field: 'status',
        headerName: t('ads.myAds.colStatus'),
        width: 120,
        filter: { type: 'select', options: adStatusOptions(t) },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      dateColumn<AdRequestRow>({
        headerName: t('ads.myAds.colSubmitted'),
        hide: false,
        width: 140,
      }),
    ],
    [t],
  );

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ads.myAds.title')} subtitle={t('ads.myAds.subtitle')} />
      <DuncitTable<AdRequestRow>
        tableId="ads-my-requests"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getAdRowId}
        onRowClick={(row) => navigate(`/ads/${row.id}`)}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/ads/new')}
          >
            {t('ads.myAds.create')}
          </Button>
        }
        emptyText={t('ads.myAds.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('ads.myAds.search')}
      />
    </Stack>
  );
}
