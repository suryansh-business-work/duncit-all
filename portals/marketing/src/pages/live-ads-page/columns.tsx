import { Chip, Stack, Typography } from '@mui/material';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { StatusChip } from '@duncit/ui';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { adPositionLabel, formatAdMoney } from '../../lib/ad-positions';
import { AD_STATUS_CHIP_COLORS, type AdRequestRow } from '../ads-approvals-page/helpers';
import {
  POSITION_OPTIONS,
  STORED_STATUS_OPTIONS,
  adTypeOptions,
} from '../ads-approvals-page/columns';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const renderAd = (row: AdRequestRow) => (
  <Stack spacing={0} sx={{ lineHeight: 1.3 }}>
    <Typography variant="body2" noWrap sx={{
      fontWeight: 700
    }}>
      {row.ad_title}
    </Typography>
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
      {row.trace_id}
    </Typography>
  </Stack>
);

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_CHIP_COLORS} />
);

const renderAdvertiser = (row: AdRequestRow) => (
  <Typography variant="body2" noWrap>
    {row.brand_name || row.submitted_by_name || EM_DASH}
  </Typography>
);

const renderType = (row: AdRequestRow) => (
  <Chip label={row.ad_type} size="small" variant="outlined" color="secondary" />
);

interface ColumnDeps {
  formatDate: (date: Date) => string;
  onStop: (row: AdRequestRow) => void;
  onDelete: (row: AdRequestRow) => void;
}

export function getLiveAdColumns({
  formatDate,
  onStop,
  onDelete,
}: Readonly<ColumnDeps>, t: Translate): DuncitColumn<AdRequestRow>[] {
  return [
    {
      field: 'ad_title',
      headerName: 'Ad',
      type: 'text',
      minWidth: 240,
      flex: 1,
      cellRenderer: renderAd,
      valueGetter: (row) => row.ad_title,
    },
    {
      // Brand name, else the submitter's name resolved per row from the users collection — no single stored path.
      field: 'submitted_by_name',
      headerName: t('marketing.liveAds.advertiser'),
      type: 'text',
      sortable: false,
      filterable: false,
      minWidth: 160,
      cellRenderer: renderAdvertiser,
      valueGetter: (row) => row.brand_name || row.submitted_by_name,
    },
    {
      field: 'position',
      headerName: t('marketing.common.placement'),
      type: 'enum',
      options: POSITION_OPTIONS,
      minWidth: 150,
      valueGetter: (row) => adPositionLabel(row.position),
    },
    {
      field: 'ad_type',
      headerName: t('shell.common.type'),
      type: 'enum',
      options: adTypeOptions(t),
      width: 110,
      cellRenderer: renderType,
      valueGetter: (row) => row.ad_type,
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      type: 'enum',
      options: STORED_STATUS_OPTIONS,
      width: 110,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    dateColumn<AdRequestRow>({
      field: 'end_at',
      headerName: t('marketing.common.ends'),
      hide: false,
      width: 160,
      formatDate,
    }),
    {
      field: 'approved_cost',
      headerName: t('marketing.common.cost'),
      type: 'number',
      width: 120,
      valueGetter: (row) =>
        formatAdMoney(row.currency_symbol, row.approved_cost ?? row.estimated_cost),
    },
    actionsColumn<AdRequestRow>({
      width: 110,
      onEdit: onStop,
      onDelete,
      edit: { title: t('marketing.liveAds.stopThisAd'), icon: <StopCircleIcon fontSize="small" />, color: 'warning' },
      delete: { title: t('marketing.liveAds.deleteThisAd'), icon: <DeleteOutlineIcon fontSize="small" /> },
    }),
  ];
}
