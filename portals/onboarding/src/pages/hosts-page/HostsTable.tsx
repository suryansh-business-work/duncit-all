import { useMemo, type MutableRefObject } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link as RouterLink } from 'react-router-dom';
import { Chip, IconButton, Link, Tooltip, Typography } from '@mui/material';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { nationalPhoneDigits } from '@duncit/utils';
import { categoryPath } from '../../utils/categoryPath';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';
import { STATUS_OPTIONS, type HostCategoryRow, type HostRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

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

function CategoryCell({ categories }: Readonly<{ categories?: HostCategoryRow[] | null }>) {
  if (!categories || categories.length === 0) {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }
  return (
    <>
      {categories.map((c) => (
        <Typography key={c.sub_category_id} variant="body2" display="block">
          {categoryPath(c) || '—'}
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
    <Typography variant="caption" color="text.secondary" display="block">
      {nationalPhoneDigits(h.phone) || '—'}
    </Typography>
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

const categoriesValue = (h: HostRow) =>
  (h.host_categories ?? []).map((c) => categoryPath(c) || '—').join(' | ');

const renderStatus = (h: HostRow) => <Chip size="small" label={h.status} />;

// Active only reflects a live, Approved host — Draft/Submitted/Rejected all
// read as Inactive regardless of the is_active flag.
const isActiveHost = (h: HostRow) => h.status === 'APPROVED' && h.is_active !== false;
const activeValue = (h: HostRow) => (isActiveHost(h) ? 'Active' : 'Inactive');

const renderActive = (h: HostRow) => (
  <Chip size="small" variant="outlined" color={isActiveHost(h) ? 'success' : 'default'} label={activeValue(h)} />
);

const renderCommission = (h: HostRow) => (
  <Chip size="small" variant="outlined" label={commissionLabel(h.host_commission_pct)} />
);

export default function HostsTable({
  fetchRows,
  refetchRef,
  onEdit,
  onReview,
  canHardDelete,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<HostRow>[]>(() => {
    const renderActions = (h: HostRow) => (
      <>
        <Tooltip title={t('onboarding.hosts.hostDetails')}>
          <IconButton size="small" component={RouterLink} to={`/hosts/${h.id}`}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('shell.common.edit')}>
          <IconButton size="small" onClick={() => onEdit(h)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('onboarding.common.review')}>
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
      { field: 'host_no', headerName: t('onboarding.hosts.hostId'), width: 130, sortable: false, valueGetter: (h) => h.host_no || '—' },
      { field: 'full_name', headerName: t('onboarding.common.host'), flex: 1, minWidth: 170, cellRenderer: renderHost, valueGetter: (h) => h.full_name || '—' },
      { field: 'email', headerName: t('onboarding.common.contact'), minWidth: 180, cellRenderer: renderContact, valueGetter: (h) => h.email || '—' },
      { field: 'documents', headerName: t('shell.nav.documents'), sortable: false, minWidth: 170, cellRenderer: renderDocuments, valueGetter: documentsValue },
      { field: 'host_categories', headerName: t('onboarding.common.category'), sortable: false, minWidth: 200, cellRenderer: renderCategories, valueGetter: categoriesValue },
      { field: 'status', headerName: t('shell.common.status'), width: 125, filter: { type: 'select', options: STATUS_OPTIONS }, cellRenderer: renderStatus, valueGetter: (h) => h.status },
      { field: 'is_active', headerName: t('onboarding.common.active'), width: 110, filter: { type: 'boolean' }, cellRenderer: renderActive, valueGetter: activeValue },
      { field: 'commission', headerName: t('onboarding.common.commission'), sortable: false, width: 130, cellRenderer: renderCommission, valueGetter: (h) => commissionLabel(h.host_commission_pct) },
      dateColumn<HostRow>({ field: 'submitted_at', headerName: t('onboarding.common.submitted'), hide: false, width: 125 }),
      { field: 'created_at', headerName: t('shell.common.created'), hide: true, width: 125, filter: { type: 'date' } },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 190, cellRenderer: renderActions },
    ];
  }, [onEdit, onReview, canHardDelete, onToggleActive, onDelete]);

  return (
    <DuncitTable<HostRow>
      tableId="onboarding-hosts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getHostRowId}
      emptyText={t('onboarding.hosts.noHostsFound')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name, email or phone"
      refetchRef={refetchRef}
    />
  );
}
