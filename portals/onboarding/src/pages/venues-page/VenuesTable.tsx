import { useMemo, type MutableRefObject } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Chip, IconButton, Link, Tooltip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';
import { STATUS_OPTIONS, type VenueRow } from './queries';

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
      fontWeight={700}
      color="inherit"
    >
      {v.venue_name}
    </Link>
    <Typography variant="caption" color="text.secondary" display="block">{v.venue_type}</Typography>
  </>
);

const locationValue = (v: VenueRow) => [v.locality, v.city].filter(Boolean).join(', ') || '—';

const renderLocation = (v: VenueRow) => (
  <>
    <Typography variant="body2">{locationValue(v)}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">{v.postal_code || '—'}</Typography>
  </>
);

const renderOwner = (v: VenueRow) => (
  <>
    <Typography variant="body2">{v.owner_name || '—'}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">{v.owner_phone || v.owner_email || '—'}</Typography>
  </>
);

const renderStatus = (v: VenueRow) => <Chip size="small" label={v.status} />;

const activeValue = (v: VenueRow) => (v.is_active === false ? 'Inactive' : 'Active');

const renderActive = (v: VenueRow) => (
  <Chip size="small" variant="outlined" color={v.is_active === false ? 'default' : 'success'} label={activeValue(v)} />
);

const renderPods = (v: VenueRow) => (
  <Tooltip title="View pods hosted at this venue">
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      startIcon={<EventNoteIcon fontSize="small" />}
      component={RouterLink}
      to={`/venues/${v.id}?tab=pods`}
    >
      {v.pod_count ?? 0}
    </Button>
  </Tooltip>
);

const renderCommission = (v: VenueRow) => (
  <Chip size="small" variant="outlined" label={commissionLabel(v.venue_commission_pct)} />
);

const submittedValue = (v: VenueRow) =>
  v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : '—';

export default function VenuesTable({
  fetchRows,
  refetchRef,
  onEdit,
  onReview,
  canHardDelete,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<VenueRow>[]>(() => {
    const renderActions = (v: VenueRow) => (
      <>
        <Tooltip title="Venue details">
          <IconButton size="small" component={RouterLink} to={`/venues/${v.id}`}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(v)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Review">
          <IconButton size="small" onClick={() => onReview(v)}>
            <RateReviewIcon fontSize="small" />
          </IconButton>
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
      { field: 'venue_name', headerName: 'Venue', flex: 1, minWidth: 180, cellRenderer: renderVenue, valueGetter: (v) => v.venue_name },
      { field: 'locality', headerName: 'Location', minWidth: 160, filter: { type: 'text' }, cellRenderer: renderLocation, valueGetter: locationValue },
      { field: 'city', headerName: 'City', hide: true, minWidth: 130, filter: { type: 'text' } },
      { field: 'venue_type', headerName: 'Type', hide: true, minWidth: 130, filter: { type: 'text' } },
      { field: 'owner_name', headerName: 'Owner', minWidth: 150, cellRenderer: renderOwner, valueGetter: (v) => v.owner_name || '—' },
      { field: 'capacity', headerName: 'Capacity', width: 105, filter: { type: 'number' } },
      { field: 'status', headerName: 'Status', width: 125, filter: { type: 'select', options: STATUS_OPTIONS }, cellRenderer: renderStatus, valueGetter: (v) => v.status },
      { field: 'is_active', headerName: 'Active', width: 110, filter: { type: 'boolean' }, cellRenderer: renderActive, valueGetter: activeValue },
      { field: 'pod_count', headerName: 'Pods', sortable: false, width: 100, cellRenderer: renderPods, valueGetter: (v) => v.pod_count ?? 0 },
      { field: 'venue_commission_pct', headerName: 'Commission', width: 130, cellRenderer: renderCommission, valueGetter: (v) => commissionLabel(v.venue_commission_pct) },
      { field: 'submitted_at', headerName: 'Submitted', width: 125, filter: { type: 'date' }, valueGetter: submittedValue },
      { field: 'created_at', headerName: 'Created', hide: true, width: 125, filter: { type: 'date' } },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 190, cellRenderer: renderActions },
    ];
  }, [onEdit, onReview, canHardDelete, onToggleActive, onDelete]);

  return (
    <DuncitTable<VenueRow>
      tableId="onboarding-venues"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getVenueRowId}
      emptyText="No venues found."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name, type, city or owner"
      refetchRef={refetchRef}
    />
  );
}
