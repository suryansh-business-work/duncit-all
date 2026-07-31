import { Box, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import type { ShortLinkClickRow } from '../queries';

const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

const DEVICE_LABELS: Record<string, string> = {
  MOBILE: 'Mobile',
  TABLET: 'Tablet',
  DESKTOP: 'Desktop',
  BOT: 'Bot',
  UNKNOWN: 'Unknown',
};

/** City, Region, Country — skipping whichever the lookup could not resolve.
 * Structurally typed so the journey table can reuse it without carrying the
 * whole click row. */
export const locationOf = (row: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}) => {
  const parts = [row.city, row.region, row.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : EM_DASH;
};

const renderPlatform = (row: ShortLinkClickRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="div">
      {row.platform}
    </Typography>
    {row.referrer_host && (
      <Typography variant="caption" color="text.secondary" component="div">
        {row.referrer_host}
      </Typography>
    )}
  </Box>
);

const renderDevice = (row: ShortLinkClickRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div">
      {DEVICE_LABELS[row.device_type] ?? row.device_type}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {`${row.os} · ${row.browser}`}
    </Typography>
  </Box>
);

export function getClickColumns(): DuncitColumn<ShortLinkClickRow>[] {
  return [
    dateColumn<ShortLinkClickRow>({
      field: 'clicked_at',
      headerName: 'When',
      hide: false,
      width: 180,
      format: DATE_TIME_FORMAT,
    }),
    {
      field: 'platform',
      headerName: 'Came from',
      minWidth: 180,
      cellRenderer: renderPlatform,
      valueGetter: (row) => row.platform,
    },
    {
      field: 'country',
      headerName: 'Location',
      minWidth: 200,
      valueGetter: locationOf,
    },
    {
      field: 'device_type',
      headerName: 'Device',
      minWidth: 170,
      filter: {
        type: 'select',
        options: Object.entries(DEVICE_LABELS).map(([value, label]) => ({ value, label })),
      },
      cellRenderer: renderDevice,
      valueGetter: (row) => DEVICE_LABELS[row.device_type] ?? row.device_type,
    },
    { field: 'os', headerName: 'OS', width: 130, hide: true },
    { field: 'browser', headerName: 'Browser', width: 160, hide: true },
  ];
}
