import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { EM_DASH, actionsColumn, dateColumn, type DuncitColumn } from '@duncit/table';
import type { ShortLinkOption, ShortLinkRow } from './queries';

interface Args {
  sources: ShortLinkOption[];
  mediums: ShortLinkOption[];
  onView: (row: ShortLinkRow) => void;
  onDelete: (row: ShortLinkRow) => void;
}

const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

const labelOf = (options: ShortLinkOption[], value: string) =>
  options.filter((option) => option.value === value).map((option) => option.label).join('') || value;

/** The channel a link was made for, showing the free text when it was Other —
 * "Other" on its own tells a marketer nothing. */
const channelText = (row: ShortLinkRow, sources: ShortLinkOption[]) =>
  row.source === 'OTHER' && row.source_other ? row.source_other : labelOf(sources, row.source);

const renderLink = (row: ShortLinkRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {row.label}
    </Typography>
    <Typography variant="caption" color="text.secondary" fontFamily="monospace" component="div">
      /{row.code}
    </Typography>
  </Box>
);

const renderStatus = (row: ShortLinkRow) => (
  <Chip
    size="small"
    label={row.is_active ? 'Active' : 'Retired'}
    color={row.is_active ? 'success' : 'default'}
    variant={row.is_active ? 'filled' : 'outlined'}
  />
);

export function getShortLinkColumns({
  sources,
  mediums,
  onView,
  onDelete,
}: Readonly<Args>): DuncitColumn<ShortLinkRow>[] {
  const toFilterOptions = (options: ShortLinkOption[]) =>
    options.map((option) => ({ value: option.value, label: option.label }));

  return [
    {
      field: 'label',
      headerName: 'Link',
      flex: 1,
      minWidth: 220,
      cellRenderer: renderLink,
      valueGetter: (row) => row.label,
    },
    {
      field: 'source',
      headerName: 'Created for',
      minWidth: 160,
      filter: { type: 'select', options: toFilterOptions(sources) },
      valueGetter: (row) => channelText(row, sources),
    },
    {
      field: 'medium',
      headerName: 'Medium',
      minWidth: 150,
      filter: { type: 'select', options: toFilterOptions(mediums) },
      valueGetter: (row) =>
        row.medium === 'OTHER' && row.medium_other
          ? row.medium_other
          : labelOf(mediums, row.medium),
    },
    {
      field: 'utm_campaign',
      headerName: 'Campaign',
      sortable: false,
      minWidth: 160,
      valueGetter: (row) => row.utm_campaign ?? EM_DASH,
    },
    { field: 'click_count', headerName: 'Clicks', width: 110 },
    dateColumn<ShortLinkRow>({
      field: 'last_clicked_at',
      headerName: 'Last click',
      hide: false,
      width: 170,
      format: DATE_TIME_FORMAT,
    }),
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      filter: { type: 'boolean' },
      cellRenderer: renderStatus,
      valueGetter: (row) => (row.is_active ? 'Active' : 'Retired'),
    },
    dateColumn<ShortLinkRow>({ width: 170, format: DATE_TIME_FORMAT }),
    actionsColumn<ShortLinkRow>({
      width: 120,
      onDelete,
      delete: { title: 'Delete link' },
      renderExtra: (row) => (
        <Tooltip title="Open link details">
          <IconButton size="small" aria-label="Open link details" onClick={() => onView(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    }),
  ];
}
