import { useMemo, type MutableRefObject } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { Link as RouterLink } from 'react-router-dom';
import { Chip, Link, Tooltip, Typography } from '@mui/material';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';
import { STATUS_OPTIONS, type VenueRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  fetchRows: TableFetch<VenueRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onEdit: (venue: VenueRow) => void;
  onReview: (venue: VenueRow) => void;
  canHardDelete: boolean;
  onToggleActive: (venue: VenueRow) => void;
  onDelete: (venue: VenueRow) => void;
}

const getVenueRowId = (v: VenueRow) => v.id;

const renderVenue = (v: VenueRow) => (
  <>
    <Link
      component={RouterLink}
      to={`/venues/${v.id}`}
      underline="hover"
      variant="body2"
      color="inherit"
      sx={{
        fontWeight: 700
      }}
    >
      {v.venue_name}
    </Link>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>{v.venue_type}</Typography>
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

const renderCategory = (v: VenueRow) => <Typography variant="body2">{categoryValue(v)}</Typography>;

const renderLocation = (v: VenueRow) => (
  <>
    <Typography variant="body2">{locationValue(v)}</Typography>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>{v.postal_code || '—'}</Typography>
  </>
);

const renderOwner = (v: VenueRow) => (
  <>
    <Typography variant="body2">{v.owner_name || '—'}</Typography>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>{v.owner_phone || v.owner_email || '—'}</Typography>
  </>
);

const renderStatus = (v: VenueRow) => <Chip size="small" label={v.status} />;

// Active only reflects a live, Approved venue — Draft/Submitted/Rejected all
// read as Inactive regardless of the is_active flag.
const isActiveVenue = (v: VenueRow) => v.status === 'APPROVED' && v.is_active !== false;
const activeValue = (v: VenueRow) => (isActiveVenue(v) ? 'Active' : 'Inactive');

const renderActive = (v: VenueRow) => (
  <Chip size="small" variant="outlined" color={isActiveVenue(v) ? 'success' : 'default'} label={activeValue(v)} />
);

const renderPods = (v: VenueRow, t: Translate) => (
  <Tooltip title={t('onboarding.venues.viewPodsHostedAtThisVenue')}>
    <DuncitButton
      size="small"
      variant="outlined"
      color="inherit"
      startIcon={<EventNoteIcon fontSize="small" />}
      component={RouterLink}
      to={`/venues/${v.id}?selectedtab=pods`}
    >
      {v.pod_count ?? 0}
    </DuncitButton>
  </Tooltip>
);

const renderCommission = (v: VenueRow) => (
  <Chip size="small" variant="outlined" label={commissionLabel(v.venue_commission_pct)} />
);

export default function VenuesTable({
  fetchRows,
  refetchRef,
  onEdit,
  onReview,
  canHardDelete,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<VenueRow>[]>(() => {
    const renderActions = (v: VenueRow) => (
      <>
        <Tooltip title={t('onboarding.common.venueDetails')}>
          <DuncitIconButton size="small" component={RouterLink} to={`/venues/${v.id}`}>
            <VisibilityIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('shell.common.edit')}>
          <DuncitIconButton size="small" onClick={() => onEdit(v)}>
            <EditIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('onboarding.common.review')}>
          <DuncitIconButton size="small" onClick={() => onReview(v)}>
            <RateReviewIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <LifecycleActions
          active={v.is_active !== false}
          onToggleActive={() => onToggleActive(v)}
          canHardDelete={canHardDelete}
          onDelete={() => onDelete(v)}
        />
      </>
    );
    return [
      { field: 'venue_no', headerName: t('onboarding.venues.venueId'), width: 130, sortable: false, valueGetter: (v) => v.venue_no || '—' },
      { field: 'venue_name', headerName: t('onboarding.common.venue'), flex: 1, minWidth: 180, cellRenderer: renderVenue, valueGetter: (v) => v.venue_name },
      { field: 'locality', headerName: t('onboarding.venues.location'), minWidth: 160, filter: { type: 'text' }, cellRenderer: renderLocation, valueGetter: locationValue },
      { field: 'city', headerName: t('onboarding.common.city'), hide: true, minWidth: 130, filter: { type: 'text' } },
      { field: 'venue_type', headerName: t('shell.common.type'), hide: true, minWidth: 130, filter: { type: 'text' } },
      { field: 'venue_category', headerName: t('onboarding.common.category'), minWidth: 200, sortable: false, cellRenderer: renderCategory, valueGetter: categoryValue },
      { field: 'owner_name', headerName: t('onboarding.common.owner'), minWidth: 150, cellRenderer: renderOwner, valueGetter: (v) => v.owner_name || '—' },
      { field: 'capacity', headerName: t('onboarding.common.capacity'), width: 105, filter: { type: 'number' } },
      { field: 'status', headerName: t('shell.common.status'), width: 125, filter: { type: 'select', options: STATUS_OPTIONS }, cellRenderer: renderStatus, valueGetter: (v) => v.status },
      { field: 'is_active', headerName: t('onboarding.common.active'), width: 110, filter: { type: 'boolean' }, cellRenderer: renderActive, valueGetter: activeValue },
      { field: 'pod_count', headerName: t('shell.nav.pods'), sortable: false, width: 100, cellRenderer: (v: VenueRow) => renderPods(v, t), valueGetter: (v) => v.pod_count ?? 0 },
      { field: 'venue_commission_pct', headerName: t('onboarding.common.commission'), width: 130, cellRenderer: renderCommission, valueGetter: (v) => commissionLabel(v.venue_commission_pct) },
      dateColumn<VenueRow>({ field: 'submitted_at', headerName: t('onboarding.common.submitted'), hide: false, width: 125 }),
      { field: 'created_at', headerName: t('shell.common.created'), hide: true, width: 125, filter: { type: 'date' } },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 190, cellRenderer: renderActions },
    ];
  }, [onEdit, onReview, canHardDelete, onToggleActive, onDelete]);

  return (
    <DuncitTable<VenueRow>
      tableId="onboarding-venues"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getVenueRowId}
      emptyText={t('onboarding.venues.noVenuesFound')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name, type, city or owner"
      refetchRef={refetchRef}
    />
  );
}
