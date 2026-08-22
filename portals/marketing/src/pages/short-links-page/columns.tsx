import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { EM_DASH, actionsColumn, dateColumn, type DuncitColumn } from '@duncit/table';
import type { CampaignChoice, ShortLinkOption, ShortLinkRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Args {
  sources: ShortLinkOption[];
  mediums: ShortLinkOption[];
  campaigns: CampaignChoice[];
  onView: (row: ShortLinkRow) => void;
  onDelete: (row: ShortLinkRow) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

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

/** A link's campaign by name — the slug is what is stored, but nobody filters
 * a report by "pod_shares". */
const campaignText = (row: ShortLinkRow, campaigns: CampaignChoice[]) => {
  if (!row.utm_campaign) return EM_DASH;
  const match = campaigns.find((campaign) => campaign.utm_campaign === row.utm_campaign);
  return match?.name ?? row.utm_campaign;
};

export function getShortLinkColumns({
  sources,
  mediums,
  campaigns,
  onView,
  onDelete,
}: Readonly<Args>, t: Translate): DuncitColumn<ShortLinkRow>[] {
  const toFilterOptions = (options: ShortLinkOption[]) =>
    options.map((option) => ({ value: option.value, label: option.label }));

  return [
    {
      field: 'label',
      headerName: t('marketing.shortLinks.link'),
      flex: 1,
      minWidth: 220,
      cellRenderer: renderLink,
      valueGetter: (row) => row.label,
    },
    {
      field: 'source',
      headerName: t('marketing.shortLinks.createdFor'),
      minWidth: 160,
      filter: { type: 'select', options: toFilterOptions(sources) },
      valueGetter: (row) => channelText(row, sources),
    },
    {
      field: 'medium',
      headerName: t('marketing.shortLinks.medium'),
      minWidth: 150,
      filter: { type: 'select', options: toFilterOptions(mediums) },
      valueGetter: (row) =>
        row.medium === 'OTHER' && row.medium_other
          ? row.medium_other
          : labelOf(mediums, row.medium),
    },
    {
      field: 'utm_campaign',
      headerName: t('marketing.common.campaign'),
      sortable: false,
      minWidth: 160,
      filter: {
        type: 'select',
        options: campaigns.map((campaign) => ({
          value: campaign.utm_campaign,
          label: campaign.name,
        })),
      },
      valueGetter: (row) => campaignText(row, campaigns),
    },
    { field: 'click_count', headerName: t('marketing.shortLinks.clicks'), width: 110 },
    dateColumn<ShortLinkRow>({
      field: 'last_clicked_at',
      headerName: t('marketing.shortLinks.lastClick'),
      hide: false,
      width: 170,
      format: DATE_TIME_FORMAT,
    }),
    {
      field: 'is_active',
      headerName: t('shell.common.status'),
      width: 120,
      filter: { type: 'boolean' },
      cellRenderer: renderStatus,
      valueGetter: (row) => (row.is_active ? 'Active' : 'Retired'),
    },
    dateColumn<ShortLinkRow>({ width: 170, format: DATE_TIME_FORMAT }),
    actionsColumn<ShortLinkRow>({
      width: 120,
      onDelete,
      delete: { title: t('marketing.shortLinks.deleteLink') },
      renderExtra: (row) => (
        <Tooltip title={t('marketing.shortLinks.openLinkDetails')}>
          <IconButton size="small" aria-label={t('marketing.shortLinks.openLinkDetails')} onClick={() => onView(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    }),
  ];
}
