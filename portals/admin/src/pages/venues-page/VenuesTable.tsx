import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import {
  DuncitTable,
  type DuncitColumn,
  type TableFetch,
  type TableFilterValue,
} from '@duncit/table';
import { STATUS_OPTIONS, type VenueRow } from './queries';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const getVenueRowId = (v: VenueRow) => v.id;

const renderVenue = (v: VenueRow) => (
  <>
    <Typography variant="body2" fontWeight={700}>
      {v.venue_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {v.venue_type || '—'}
    </Typography>
  </>
);

const locationValue = (v: VenueRow) => [v.locality, v.city].filter(Boolean).join(', ') || '—';

const categoryValue = (v: VenueRow) =>
  [
    v.venue_category?.super_category_name,
    v.venue_category?.category_name,
    v.venue_category?.sub_category_name,
  ]
    .filter(Boolean)
    .join(' > ') || '—';

const renderOwner = (v: VenueRow) => (
  <>
    <Typography variant="body2">{v.owner_name || '—'}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {v.owner_phone || v.owner_email || '—'}
    </Typography>
  </>
);

const renderStatus = (v: VenueRow) => <Chip size="small" label={v.status} />;

type Translate = ReturnType<typeof useTranslation>['t'];

const activeValue = (v: VenueRow, t: Translate) =>
  v.is_active === false ? t('admin.profile.inactive') : t('admin.profile.active');

const renderActive = (v: VenueRow, t: Translate) => (
  <Chip
    size="small"
    variant="outlined"
    color={v.is_active === false ? 'default' : 'success'}
    label={activeValue(v, t)}
  />
);

const createdValue = (v: VenueRow) =>
  v.created_at ? formatDate(v.created_at) : '—';

/** Read-only admin venues list — approvals/edits stay in the Onboarding portal. */
export default function VenuesTable({
  fetchRows,
  refetchRef,
  superCategoryId,
}: Readonly<{
  fetchRows: TableFetch<VenueRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Toolbar's Super Category filter; '' means every super category. */
  superCategoryId: string;
}>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<VenueRow>[]>(
    () => [
      { field: 'venue_name', headerName: t('admin.faqs.audienceVenue'), flex: 1, minWidth: 180, cellRenderer: renderVenue, valueGetter: (v) => v.venue_name },
      { field: 'venue_category', headerName: t('admin.clubs.colCategory'), minWidth: 200, sortable: false, valueGetter: categoryValue },
      { field: 'locality', headerName: t('admin.venues.colLocation'), minWidth: 160, filter: { type: 'text' }, valueGetter: locationValue },
      { field: 'owner_name', headerName: t('admin.venues.colOwner'), minWidth: 150, cellRenderer: renderOwner, valueGetter: (v) => v.owner_name || '—' },
      { field: 'capacity', headerName: t('admin.venues.colCapacity'), width: 105, filter: { type: 'number' } },
      { field: 'status', headerName: t('shell.common.status'), width: 125, filter: { type: 'select', options: STATUS_OPTIONS }, cellRenderer: renderStatus, valueGetter: (v) => v.status },
      { field: 'is_active', headerName: t('admin.profile.active'), width: 110, filter: { type: 'boolean' }, cellRenderer: (row: VenueRow) => renderActive(row, t), valueGetter: (row: VenueRow) => activeValue(row, t) },
      { field: 'pod_count', headerName: t('admin.clubs.pods'), sortable: false, width: 90, valueGetter: (v) => v.pod_count ?? 0 },
      { field: 'created_at', headerName: t('shell.common.created'), width: 125, filter: { type: 'date' }, valueGetter: createdValue },
    ],
    [t],
  );

  // Pinned page filter rather than a column one: it belongs to the header, so
  // it never shows as a removable chip and a change resets to page 1.
  const externalFilters = useMemo<TableFilterValue[]>(
    () =>
      superCategoryId ? [{ field: 'super_category_id', op: 'eq', value: superCategoryId }] : [],
    [superCategoryId],
  );

  return (
    <DuncitTable<VenueRow>
      tableId="admin-venues"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getVenueRowId}
      emptyText={t('admin.venues.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name, type, city or owner"
      externalFilters={externalFilters}
      refetchRef={refetchRef}
    />
  );
}
