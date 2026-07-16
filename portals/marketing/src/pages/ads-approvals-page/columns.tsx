import { Button, Chip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { StatusChip } from '@duncit/ui';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { AD_POSITIONS, adPositionLabel, formatAdMoney } from '../../lib/ad-positions';
import { AD_STATUS_CHIP_COLORS, type AdRequestRow } from './helpers';

const POSITION_OPTIONS = AD_POSITIONS.map((p) => ({ value: p.position, label: p.label }));

const AD_TYPE_OPTIONS = [
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
];

const renderAdType = (row: AdRequestRow) => (
  <Chip label={row.ad_type} size="small" variant="outlined" color="secondary" />
);

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_CHIP_COLORS} />
);

interface ColumnDeps {
  onReview: (row: AdRequestRow) => void;
}

export function getAdColumns({ onReview }: Readonly<ColumnDeps>): DuncitColumn<AdRequestRow>[] {
  const renderAction = (row: AdRequestRow) => (
    <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => onReview(row)}>
      Review
    </Button>
  );
  return [
    {
      field: 'trace_id',
      headerName: 'Trace ID',
      width: 130,
      valueGetter: (row) => row.trace_id,
    },
    {
      field: 'ad_title',
      headerName: 'Ad Title',
      flex: 1.2,
      minWidth: 200,
      valueGetter: (row) => row.ad_title,
    },
    {
      // Display name resolved server-side; no sortable DB path, so keep it unsorted.
      field: 'submitted_by_name',
      headerName: 'Submitted By',
      sortable: false,
      flex: 1,
      minWidth: 150,
      valueGetter: (row) => row.submitted_by_name || '—',
    },
    {
      field: 'position',
      headerName: 'Position',
      filter: { type: 'select', options: POSITION_OPTIONS },
      minWidth: 160,
      valueGetter: (row) => adPositionLabel(row.position),
    },
    {
      field: 'ad_type',
      headerName: 'Media',
      filter: { type: 'select', options: AD_TYPE_OPTIONS },
      width: 110,
      cellRenderer: renderAdType,
      valueGetter: (row) => row.ad_type,
    },
    dateColumn<AdRequestRow>({
      field: 'start_at',
      headerName: 'Starts',
      hide: false,
      width: 130,
    }),
    {
      field: 'duration_days',
      headerName: 'Days',
      width: 90,
      valueGetter: (row) => row.duration_days,
    },
    {
      field: 'estimated_cost',
      headerName: 'Est. Cost',
      width: 130,
      valueGetter: (row) => formatAdMoney(row.currency_symbol, row.estimated_cost),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    dateColumn<AdRequestRow>({
      headerName: 'Requested',
      hide: false,
      width: 160,
      format: 'd MMM yyyy, HH:mm',
    }),
    { field: 'actions', headerName: 'Action', sortable: false, width: 120, cellRenderer: renderAction },
  ];
}
