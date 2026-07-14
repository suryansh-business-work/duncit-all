import { useMemo, type MutableRefObject } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';
import { STATUS_OPTIONS, type EcommBrandRow } from './queries';

interface Props {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onEdit: (brand: EcommBrandRow) => void;
  onReview: (brand: EcommBrandRow) => void;
  canHardDelete: boolean;
  onToggleActive: (brand: EcommBrandRow) => void;
  onDelete: (brand: EcommBrandRow) => void;
}

const getBrandRowId = (b: EcommBrandRow) => b.id;

const renderBrand = (b: EcommBrandRow) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Avatar src={b.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
      {(b.brand_name || '?').charAt(0).toUpperCase()}
    </Avatar>
    <Box>
      <Typography variant="body2" fontWeight={700}>{b.brand_name || 'Untitled brand'}</Typography>
      <Typography variant="caption" color="text.secondary">{b.tagline || '—'}</Typography>
    </Box>
  </Stack>
);

const categoriesValue = (b: EcommBrandRow) => (b.product_categories ?? []).join(', ') || '—';

const renderProducts = (b: EcommBrandRow) => (
  <Chip size="small" variant="outlined" label={`${b.approved_product_count ?? 0} live`} />
);

const renderOwner = (b: EcommBrandRow) => (
  <>
    <Typography variant="body2">{b.contact_person || '—'}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">{b.contact_email || b.contact_phone || '—'}</Typography>
  </>
);

const renderStatus = (b: EcommBrandRow) => <Chip size="small" label={b.status} />;

const activeValue = (b: EcommBrandRow) => (b.is_active === false ? 'Inactive' : 'Active');

const renderActive = (b: EcommBrandRow) => (
  <Chip size="small" variant="outlined" color={b.is_active === false ? 'default' : 'success'} label={activeValue(b)} />
);

const renderCommission = (b: EcommBrandRow) => (
  <Chip size="small" variant="outlined" label={commissionLabel(b.product_commission_pct)} />
);

const submittedValue = (b: EcommBrandRow) =>
  b.submitted_at ? new Date(b.submitted_at).toLocaleDateString() : '—';

export default function EcommBrandsTable({
  fetchRows,
  refetchRef,
  onEdit,
  onReview,
  canHardDelete,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(() => {
    const renderActions = (b: EcommBrandRow) => (
      <>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(b)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Review">
          <IconButton size="small" onClick={() => onReview(b)}>
            <RateReviewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <LifecycleActions
          active={b.is_active !== false}
          onToggleActive={() => onToggleActive(b)}
          canHardDelete={canHardDelete}
          onDelete={() => onDelete(b)}
        />
      </>
    );
    return [
      {
        field: 'brand_name',
        headerName: 'Brand',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderBrand,
        valueGetter: (b) => b.brand_name || 'Untitled brand',
      },
      {
        field: 'product_categories',
        headerName: 'Categories',
        sortable: false,
        minWidth: 160,
        valueGetter: categoriesValue,
      },
      {
        field: 'approved_product_count',
        headerName: 'Products',
        sortable: false,
        width: 110,
        cellRenderer: renderProducts,
        valueGetter: (b) => b.approved_product_count ?? 0,
      },
      {
        field: 'contact_person',
        headerName: 'Owner',
        sortable: false,
        minWidth: 160,
        cellRenderer: renderOwner,
        valueGetter: (b) => b.contact_person || '—',
      },
      { field: 'city', headerName: 'City', hide: true, minWidth: 130, filter: { type: 'text' } },
      {
        field: 'status',
        headerName: 'Status',
        width: 125,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (b) => b.status,
      },
      {
        field: 'is_active',
        headerName: 'Active',
        sortable: false,
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderActive,
        valueGetter: activeValue,
      },
      {
        field: 'product_commission_pct',
        headerName: 'Commission',
        sortable: false,
        width: 130,
        filter: { type: 'number' },
        cellRenderer: renderCommission,
        valueGetter: (b) => commissionLabel(b.product_commission_pct),
      },
      {
        field: 'submitted_at',
        headerName: 'Submitted',
        width: 125,
        filter: { type: 'date' },
        valueGetter: submittedValue,
      },
      { field: 'created_at', headerName: 'Created', hide: true, width: 125, filter: { type: 'date' } },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 160, cellRenderer: renderActions },
    ];
  }, [onEdit, onReview, canHardDelete, onToggleActive, onDelete]);

  return (
    <DuncitTable<EcommBrandRow>
      tableId="onboarding-ecomm-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBrandRowId}
      emptyText="No brands found."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search brand, contact or city"
      refetchRef={refetchRef}
    />
  );
}
