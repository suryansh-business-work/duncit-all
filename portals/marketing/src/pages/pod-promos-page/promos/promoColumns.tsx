import { Box, Stack, Typography } from '@mui/material';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { formatINR } from '@duncit/utils';
import type { Translate } from '@duncit/shell';
import { enumOptions } from '../../social-accounts-page/copy';
import { PROMO_SOURCES, PROMO_SOURCE_LABEL, PROMO_STATUSES, PROMO_STATUS_COLOR, PROMO_STATUS_LABEL } from '../copy';
import type { PodPromo } from '../queries';

const THUMB = 40;

function PodCell({ row }: Readonly<{ row: PodPromo }>) {
  return (
    <Stack sx={{ minWidth: 0, justifyContent: 'center', height: '100%' }}>
      <Typography variant="body2" noWrap>
        {row.pod_title}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {[row.club_name, row.city_name].filter(Boolean).join(' · ')}
      </Typography>
    </Stack>
  );
}

function BannerCell({ row, t }: Readonly<{ row: PodPromo; t: Translate }>) {
  if (!row.banner_url) return <>{EM_DASH}</>;
  return (
    <Box
      component="img"
      src={row.banner_url}
      alt={t('marketing.podPromo.bannerAlt', { vars: { title: row.pod_title } })}
      loading="lazy"
      sx={{ width: THUMB, height: THUMB, objectFit: 'cover', borderRadius: 1, display: 'block', mt: 0.5 }}
    />
  );
}

/** Each promotion: the pod, when it starts, where its post stands, and what it brought in. */
export function getPromoColumns(t: Translate, locale: string): DuncitColumn<PodPromo>[] {
  return [
    {
      field: 'pod_title',
      headerName: t('marketing.podPromo.colPod'),
      flex: 1,
      minWidth: 220,
      type: 'text',
      cellRenderer: (row) => <PodCell row={row} />,
      valueGetter: (row) => row.pod_title,
    },
    dateColumn<PodPromo>({ field: 'pod_start', headerName: t('marketing.podPromo.colPodStart'), width: 170 }),
    {
      field: 'status',
      headerName: t('marketing.podPromo.colStatus'),
      width: 150,
      type: 'enum',
      options: enumOptions(PROMO_STATUSES, PROMO_STATUS_LABEL, t),
      cellRenderer: (row) => (
        <StatusChip size="small" status={row.status} colorMap={PROMO_STATUS_COLOR} label={t(PROMO_STATUS_LABEL[row.status])} />
      ),
      valueGetter: (row) => t(PROMO_STATUS_LABEL[row.status]),
    },
    {
      field: 'source',
      headerName: t('marketing.podPromo.colSource'),
      width: 120,
      type: 'enum',
      hide: true,
      options: enumOptions(PROMO_SOURCES, PROMO_SOURCE_LABEL, t),
      valueGetter: (row) => t(PROMO_SOURCE_LABEL[row.source]),
    },
    dateColumn<PodPromo>({ field: 'scheduled_at', headerName: t('marketing.podPromo.colScheduled'), width: 170 }),
    {
      field: 'banner_url',
      headerName: t('marketing.podPromo.colBanner'),
      type: 'text',
      width: 90,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <BannerCell row={row} t={t} />,
    },
    {
      field: 'clicks',
      headerName: t('marketing.podPromo.colClicks'),
      type: 'number',
      width: 100,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.figures.clicks.toLocaleString(locale),
    },
    {
      field: 'bookings',
      headerName: t('marketing.podPromo.colBookings'),
      type: 'number',
      width: 110,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.figures.bookings.toLocaleString(locale),
    },
    {
      field: 'revenue',
      headerName: t('marketing.podPromo.colRevenue'),
      type: 'number',
      width: 120,
      sortable: false,
      filterable: false,
      valueGetter: (row) => formatINR(row.figures.revenue),
    },
  ];
}
