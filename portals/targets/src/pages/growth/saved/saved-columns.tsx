import { Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { dateColumn, rowMenuColumn, type DuncitColumn } from '@duncit/table';
import type { SavedCalculation } from '../../../lib/queries';
import { formatRupees, formatTarget } from '../../../lib/growth-format';
import type { Translate } from '../save-calculation/save-calculation.types';

export interface SavedRowActions {
  onView: (row: SavedCalculation) => void;
  onEdit: (row: SavedCalculation) => void;
  onDuplicate: (row: SavedCalculation) => void;
  onDelete: (row: SavedCalculation) => void;
}

interface ColumnArgs extends SavedRowActions {
  t: Translate;
  formatDateTime: (iso: string) => string;
}

/** A whole-number total; `field` is the server's sort and filter key for it. */
const countColumn = (
  field: string,
  headerName: string,
  read: (row: SavedCalculation) => number
): DuncitColumn<SavedCalculation> => ({
  field,
  headerName,
  type: 'number',
  width: 120,
  valueGetter: read,
  cellRenderer: (row) => formatTarget(read(row)),
});

const moneyColumn = (
  field: string,
  headerName: string,
  read: (row: SavedCalculation) => string
): DuncitColumn<SavedCalculation> => ({
  field,
  headerName,
  type: 'number',
  width: 150,
  valueGetter: (row) => Number(read(row)),
  cellRenderer: (row) => formatRupees(read(row)),
});

/**
 * The Saved Calculations columns. Fields are the server's sort/filter keys
 * (growthCalculationsTable), so sorting and filtering run over every record,
 * not just the page on screen. Edit and Delete are greyed out on rows the
 * server says the reader may not change.
 */
export function getSavedColumns({
  t,
  formatDateTime,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: ColumnArgs): DuncitColumn<SavedCalculation>[] {
  return [
    {
      field: 'title',
      headerName: t('targets.growth.saved.colTitle'),
      type: 'text',
      minWidth: 180,
      flex: 1,
      cellRenderer: (row) => (
        <Typography variant="body2" noWrap title={row.title} sx={{ fontWeight: 600 }}>
          {row.title}
        </Typography>
      ),
    },
    {
      field: 'description',
      headerName: t('targets.growth.saved.colDescription'),
      type: 'text',
      minWidth: 180,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => (
        <Typography variant="body2" noWrap title={row.description} sx={{ color: 'text.secondary' }}>
          {row.description}
        </Typography>
      ),
    },
    {
      field: 'calculated_by_name',
      headerName: t('targets.growth.saved.colCalculatedBy'),
      type: 'text',
      width: 160,
      valueGetter: (row) => row.calculated_by.name,
    },
    dateColumn<SavedCalculation>({
      field: 'created_at',
      headerName: t('targets.growth.saved.colCreatedAt'),
      hide: false,
      width: 180,
      formatDate: (date) => formatDateTime(date.toISOString()),
    }),
    countColumn('cities', t('targets.growth.saved.colCities'), (row) => row.totals.cities),
    countColumn('venues', t('targets.growth.saved.colVenues'), (row) => row.totals.venues),
    countColumn('hosts', t('targets.growth.saved.colHosts'), (row) => row.totals.hosts),
    countColumn('monthly_pods', t('targets.growth.saved.colMonthlyPods'), (row) => row.totals.monthly_pods),
    countColumn('host_leads', t('targets.growth.saved.colHostLeads'), (row) => row.totals.host_leads),
    countColumn('venue_leads', t('targets.growth.saved.colVenueLeads'), (row) => row.totals.venue_leads),
    moneyColumn('monthly_gmv', t('targets.growth.saved.colMonthlyGmv'), (row) => row.totals.monthly_gmv),
    moneyColumn('monthly_earnings', t('targets.growth.saved.colMonthlyEarnings'), (row) => row.totals.monthly_earnings),
    rowMenuColumn<SavedCalculation>({
      ariaLabel: (row) => t('targets.growth.saved.rowActions', { vars: { title: row.title } }),
      items: (row) => [
        { key: 'view', label: t('targets.growth.saved.view'), icon: <VisibilityIcon fontSize="small" />, onClick: () => onView(row) },
        {
          key: 'edit',
          label: t('targets.growth.saved.edit'),
          icon: <EditIcon fontSize="small" />,
          disabled: !row.can_edit,
          onClick: () => onEdit(row),
        },
        {
          key: 'duplicate',
          label: t('targets.growth.saved.duplicate'),
          icon: <ContentCopyIcon fontSize="small" />,
          onClick: () => onDuplicate(row),
        },
        {
          key: 'delete',
          label: t('targets.growth.saved.delete'),
          icon: <DeleteOutlineIcon fontSize="small" />,
          disabled: !row.can_edit,
          destructive: true,
          onClick: () => onDelete(row),
        },
      ],
    }),
  ];
}
