import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Tooltip } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import {
  LOCATION_SUBSCRIPTIONS_TABLE,
  type LaunchCityRow,
  type LocationSubscriptionRow,
  type LocationSubscriptionStatus,
} from './queries';

interface Props {
  /** The cities that have subscribers — the only values the City filter can match. */
  cities: readonly LaunchCityRow[];
  refetchRef: MutableRefObject<(() => void) | null>;
}

type Translate = ReturnType<typeof useTranslation>['t'];
type ChipColor = 'default' | 'success' | 'warning' | 'error';

const STATUS_COLOR: Record<LocationSubscriptionStatus, ChipColor> = {
  PENDING: 'default',
  SENT: 'success',
  SKIPPED: 'warning',
  FAILED: 'error',
};

const statusLabels = (t: Translate): Record<LocationSubscriptionStatus, string> => ({
  PENDING: t('admin.locationSubscriptions.statusPending'),
  SENT: t('admin.locationSubscriptions.statusSent'),
  SKIPPED: t('admin.locationSubscriptions.statusSkipped'),
  FAILED: t('admin.locationSubscriptions.statusFailed'),
});

const getRowId = (row: LocationSubscriptionRow) => row.id;

interface StatusChipProps {
  row: LocationSubscriptionRow;
  label: string;
}

/** Why a send was skipped or failed rides in the chip's tooltip. */
function StatusChip({ row, label }: Readonly<StatusChipProps>) {
  return (
    <Tooltip title={row.reason}>
      <Chip size="small" color={STATUS_COLOR[row.status]} label={label} />
    </Tooltip>
  );
}

/** Every subscriber across cities, paged and filtered on the server. */
export default function SubscribersTable({ cities, refetchRef }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();

  const fetchRows = useApolloTableFetch<LocationSubscriptionRow>(
    client,
    LOCATION_SUBSCRIPTIONS_TABLE,
    'locationSubscriptionsTable'
  );

  const columns = useMemo<DuncitColumn<LocationSubscriptionRow>[]>(() => {
    const labels = statusLabels(t);
    const cityOptions = cities.map((c) => ({ value: c.id, label: c.city }));
    const statusOptions = (Object.keys(labels) as LocationSubscriptionStatus[]).map((s) => ({
      value: s,
      label: labels[s],
    }));
    // Sort and filter exactly what locationSubscriptionsTable allowlists: name and
    // WhatsApp sort but are matched through the search box, not a column filter.
    return [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        type: 'text',
        filterable: false,
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'whatsapp',
        headerName: t('admin.locationSubscriptions.whatsapp'),
        type: 'text',
        filterable: false,
        minWidth: 160,
      },
      {
        field: 'location_doc_id',
        headerName: t('admin.locations.city'),
        type: 'enum',
        options: cityOptions,
        // The city name lives on the Location, so there is no stored value to order by.
        sortable: false,
        minWidth: 150,
        valueGetter: (row) => row.city,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: statusOptions,
        minWidth: 130,
        cellRenderer: (row) => <StatusChip row={row} label={labels[row.status]} />,
        valueGetter: (row) => labels[row.status],
      },
      {
        field: 'created_at',
        headerName: t('admin.locationSubscriptions.subscribedAt'),
        type: 'date',
        minWidth: 190,
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'notified_at',
        headerName: t('admin.locationSubscriptions.notifiedAt'),
        type: 'date',
        minWidth: 190,
        valueGetter: (row) => (row.notified_at ? formatDateTime(row.notified_at) : '—'),
      },
    ];
  }, [cities, formatDateTime, t]);

  return (
    <DuncitTable<LocationSubscriptionRow>
      ariaLabel={t('admin.locationSubscriptions.subscribersTitle')}
      tableId="admin-location-subscriptions"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('admin.locationSubscriptions.subscribersEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('admin.locationSubscriptions.searchSubscribers')}
      refetchRef={refetchRef}
    />
  );
}
