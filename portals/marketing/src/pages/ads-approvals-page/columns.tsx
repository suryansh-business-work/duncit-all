import { Button, Chip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { StatusChip } from '@duncit/ui';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { AD_POSITIONS, adPositionLabel, formatAdMoney } from '../../lib/ad-positions';
import { AD_STATUS_CHIP_COLORS, type AdRequestRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

const POSITION_OPTIONS = AD_POSITIONS.map((p) => ({ value: p.position, label: p.label }));

type Translate = ReturnType<typeof useTranslation>['t'];

const adTypeOptions = (t: Translate) => [
  { value: 'IMAGE', label: t('marketing.adsApprovals.image') },
  { value: 'VIDEO', label: t('marketing.adsApprovals.video') },
];

const adKindOptions = (t: Translate) => [
  { value: 'PLACEMENT', label: t('marketing.common.placement') },
  { value: 'PRODUCT_AD', label: t('marketing.adsApprovals.productAd') },
  { value: 'BRAND_AD', label: t('marketing.adsApprovals.brandAd') },
];

const adKindLabel = (row: AdRequestRow): string => {
  if (row.ad_kind === 'PRODUCT_AD') return row.product_name ? `Product · ${row.product_name}` : 'Product Ad';
  if (row.ad_kind === 'BRAND_AD') return row.brand_name ? `Brand · ${row.brand_name}` : 'Brand Ad';
  return 'Placement';
};

const renderAdType = (row: AdRequestRow) => (
  <Chip label={row.ad_type} size="small" variant="outlined" color="secondary" />
);

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_CHIP_COLORS} />
);

interface ColumnDeps {
  onReview: (row: AdRequestRow) => void;
}

export function getAdColumns({ onReview }: Readonly<ColumnDeps>, t: Translate): DuncitColumn<AdRequestRow>[] {
  const renderAction = (row: AdRequestRow) => (
    <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => onReview(row)}>
      Review
    </Button>
  );
  return [
    {
      field: 'trace_id',
      headerName: t('marketing.adsApprovals.traceId'),
      width: 130,
      valueGetter: (row) => row.trace_id,
    },
    {
      field: 'ad_kind',
      headerName: t('marketing.adsApprovals.kind'),
      filter: { type: 'select', options: adKindOptions(t) },
      minWidth: 170,
      valueGetter: adKindLabel,
    },
    {
      field: 'ad_title',
      headerName: t('marketing.adsApprovals.adTitle'),
      flex: 1.2,
      minWidth: 200,
      valueGetter: (row) => row.ad_title,
    },
    {
      // Display name resolved server-side; no sortable DB path, so keep it unsorted.
      field: 'submitted_by_name',
      headerName: t('marketing.adsApprovals.submittedBy'),
      sortable: false,
      flex: 1,
      minWidth: 150,
      valueGetter: (row) => row.submitted_by_name || '—',
    },
    {
      field: 'position',
      headerName: t('marketing.common.position'),
      filter: { type: 'select', options: POSITION_OPTIONS },
      minWidth: 160,
      valueGetter: (row) => adPositionLabel(row.position),
    },
    {
      field: 'ad_type',
      headerName: t('marketing.adsApprovals.media'),
      filter: { type: 'select', options: adTypeOptions(t) },
      width: 110,
      cellRenderer: renderAdType,
      valueGetter: (row) => row.ad_type,
    },
    dateColumn<AdRequestRow>({
      field: 'start_at',
      headerName: t('marketing.common.starts'),
      hide: false,
      width: 130,
    }),
    {
      field: 'duration_days',
      headerName: t('marketing.common.days'),
      width: 90,
      valueGetter: (row) => row.duration_days,
    },
    {
      field: 'estimated_cost',
      headerName: t('marketing.adsApprovals.estCost'),
      width: 130,
      valueGetter: (row) => formatAdMoney(row.currency_symbol, row.estimated_cost),
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      width: 120,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    dateColumn<AdRequestRow>({
      headerName: t('marketing.adsApprovals.requested'),
      hide: false,
      width: 160,
      format: 'd MMM yyyy, HH:mm',
    }),
    { field: 'actions', headerName: t('marketing.adsApprovals.action'), sortable: false, width: 120, cellRenderer: renderAction },
  ];
}
