import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Tooltip } from '@mui/material';
import {
  DuncitTable,
  activeChipColumn,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFilterValue,
} from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import {
  LOCATION_SUBSCRIPTIONS_TABLE,
  type LaunchCityRow,
  type LocationSubscriptionRow,
  type LocationSubscriptionStatus,
} from './queries';

interface Props {
  /** The city picked in the Cities table — the only city this table pages. */
  city: LaunchCityRow;
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

/** Every subscriber of the chosen city, paged and filtered on the server. */
export default function SubscribersTable({ city, refetchRef }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  // The city scope rides outside the column filters, so a new pick resets to page 1.
  const externalFilters = useMemo<TableFilterValue[]>(
    () => [{ field: 'location_doc_id', op: 'in', values: [city.id] }],
    [city.id]
  );

  const fetchRows = useApolloTableFetch<LocationSubscriptionRow>(
    client,
    LOCATION_SUBSCRIPTIONS_TABLE,
    'locationSubscriptionsTable'
  );

  const columns = useMemo<DuncitColumn<LocationSubscriptionRow>[]>(() => {
    const labels = statusLabels(t);
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
        type: 'text',
        // The city is the one picked above, and its name lives on the Location, so
        // there is nothing to filter or order by here.
        filterable: false,
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
      // The answer to the app's "share your current location?" question, asked
      // as the name was added; the ✕ on that dialog counts as No.
      activeChipColumn<LocationSubscriptionRow>({
        field: 'location_shared',
        headerName: t('admin.locationSubscriptions.locationShared'),
        width: 150,
        activeLabel: t('shell.common.yes'),
        inactiveLabel: t('shell.common.no'),
        outlineInactive: true,
      }),
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
  }, [formatDateTime, t]);

  return (
    <DuncitTable<LocationSubscriptionRow>
      ariaLabel={t('admin.locationSubscriptions.subscribersTitle')}
      tableId="admin-location-subscriptions"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      externalFilters={externalFilters}
      emptyText={t('admin.locationSubscriptions.subscribersEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('admin.locationSubscriptions.searchSubscribers')}
      refetchRef={refetchRef}
    />
  );
}
