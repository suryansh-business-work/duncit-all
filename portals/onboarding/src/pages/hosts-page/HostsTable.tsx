import { useMemo, type MutableRefObject } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link as RouterLink } from 'react-router-dom';
import { Chip, IconButton, Link, Tooltip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';
import { STATUS_OPTIONS, type HostCategoryRow, type HostRow } from './queries';

interface Props {
  fetchRows: TableFetch<HostRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onEdit: (host: HostRow) => void;
  onReview: (host: HostRow) => void;
  canHardDelete: boolean;
  onToggleActive: (host: HostRow) => void;
  onDelete: (host: HostRow) => void;
}

const getHostRowId = (h: HostRow) => h.id;

const catPath = (c: HostCategoryRow) =>
  [c.super_category_name, c.category_name, c.sub_category_name].filter(Boolean).join(' › ') || '—';

function CategoryCell({ categories }: Readonly<{ categories?: HostCategoryRow[] | null }>) {
  if (!categories || categories.length === 0) {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }
  return (
    <>
      {categories.map((c) => (
        <Typography key={c.request_no || catPath(c)} variant="body2" display="block">
          {catPath(c)}
        </Typography>
      ))}
    </>
  );
}

const renderHost = (h: HostRow) => (
  <>
    <Link
      component={RouterLink}
      to={`/hosts/${h.id}`}
      underline="hover"
      variant="body2"
      fontWeight={700}
      color="inherit"
    >
      {h.full_name || '—'}
    </Link>
    <Typography variant="caption" color="text.secondary" display="block">{h.user_id}</Typography>
  </>
);

const renderContact = (h: HostRow) => (
  <>
    <Typography variant="body2">{h.email || '—'}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">{h.phone || '—'}</Typography>
  </>
);

const documentsValue = (h: HostRow) =>
  `PAN: ${h.pan_number || '—'} · Aadhar: ${h.aadhar_number || '—'}`;

const renderDocuments = (h: HostRow) => (
  <>
    <Typography variant="caption" display="block">PAN: {h.pan_number || '—'}</Typography>
    <Typography variant="caption" display="block">Aadhar: {h.aadhar_number || '—'}</Typography>
  </>
);

const renderCategories = (h: HostRow) => <CategoryCell categories={h.host_categories} />;

const categoriesValue = (h: HostRow) => (h.host_categories ?? []).map(catPath).join(' | ');

const renderStatus = (h: HostRow) => <Chip size="small" label={h.status} />;

const activeValue = (h: HostRow) => (h.is_active === false ? 'Inactive' : 'Active');

const renderActive = (h: HostRow) => (
  <Chip size="small" variant="outlined" color={h.is_active === false ? 'default' : 'success'} label={activeValue(h)} />
);

const renderCommission = (h: HostRow) => (
  <Chip size="small" variant="outlined" label={commissionLabel(h.host_commission_pct)} />
);

const submittedValue = (h: HostRow) =>
  h.submitted_at ? new Date(h.submitted_at).toLocaleDateString() : '—';

export default function HostsTable({
  fetchRows,
  refetchRef,
  onEdit,
  onReview,
  canHardDelete,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<HostRow>[]>(() => {
    const renderActions = (h: HostRow) => (
      <>
        <Tooltip title="Host details">
          <IconButton size="small" component={RouterLink} to={`/hosts/${h.id}`}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(h)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Review">
          <IconButton size="small" onClick={() => onReview(h)}>
            <RateReviewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <LifecycleActions
          active={h.is_active !== false}
          onToggleActive={() => onToggleActive(h)}
          canHardDelete={canHardDelete}
          onDelete={() => onDelete(h)}
        />
      </>
    );
    return [
      { field: 'full_name', headerName: 'Host', flex: 1, minWidth: 170, cellRenderer: renderHost, valueGetter: (h) => h.full_name || '—' },
      { field: 'email', headerName: 'Contact', minWidth: 180, cellRenderer: renderContact, valueGetter: (h) => h.email || '—' },
      { field: 'documents', headerName: 'Documents', sortable: false, minWidth: 170, cellRenderer: renderDocuments, valueGetter: documentsValue },
      { field: 'host_categories', headerName: 'Category', sortable: false, minWidth: 200, cellRenderer: renderCategories, valueGetter: categoriesValue },
      { field: 'status', headerName: 'Status', width: 125, filter: { type: 'select', options: STATUS_OPTIONS }, cellRenderer: renderStatus, valueGetter: (h) => h.status },
      { field: 'is_active', headerName: 'Active', width: 110, filter: { type: 'boolean' }, cellRenderer: renderActive, valueGetter: activeValue },
      { field: 'commission', headerName: 'Commission', sortable: false, width: 130, cellRenderer: renderCommission, valueGetter: (h) => commissionLabel(h.host_commission_pct) },
      { field: 'submitted_at', headerName: 'Submitted', width: 125, filter: { type: 'date' }, valueGetter: submittedValue },
      { field: 'created_at', headerName: 'Created', hide: true, width: 125, filter: { type: 'date' } },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 190, cellRenderer: renderActions },
    ];
  }, [onEdit, onReview, canHardDelete, onToggleActive, onDelete]);

  return (
    <DuncitTable<HostRow>
      tableId="onboarding-hosts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getHostRowId}
      emptyText="No hosts found."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name, email or phone"
      refetchRef={refetchRef}
    />
  );
}
