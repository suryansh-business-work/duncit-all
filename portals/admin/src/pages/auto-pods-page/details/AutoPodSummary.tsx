import type { ReactNode } from 'react';
import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { ChipList, InfoRow } from '@duncit/ui';
import {
  autoPodCityLabel,
  formatMoney,
  type AutoPodLabels,
  type AutoPodTranslate,
} from '@duncit/utils';
import { categoryPathOf } from '../helpers';
import type { AutoPodDetailsRow } from '../queries';

interface Props {
  row: AutoPodDetailsRow;
  t: AutoPodTranslate;
  labels: AutoPodLabels;
  formatDateTime: (value: string) => string;
}

interface SummaryRow {
  label: string;
  value: ReactNode;
}

/** The meeting rows a virtual offer shows — or who will fill them in. */
function meetingValue(row: AutoPodDetailsRow, t: AutoPodTranslate): string {
  if (!row.meeting_url) return t('admin.autoPods.summaryMeetingPending');
  return [row.meeting_platform, row.meeting_url].filter(Boolean).join(' · ');
}

/**
 * The template read back on the offer's own page: what every partner sees
 * before they enrol, plus the numbers a host has since set. The price and the
 * spots are absent until one has — the template carries neither.
 */
export default function AutoPodSummary({ row, t, labels, formatDateTime }: Readonly<Props>) {
  const empty = t('admin.autoPods.summaryMeetingPending');
  const dash = '—';
  const virtual = row.pod_mode === 'VIRTUAL';
  const city = autoPodCityLabel(row.location);
  const when = row.pod_date_time ? formatDateTime(row.pod_date_time) : '';
  const venueWhen = row.venue_claim ? formatDateTime(row.venue_claim.pod_date_time) : '';

  const rows: SummaryRow[] = [
    { label: t('admin.autoPods.colCategory'), value: categoryPathOf(row) || dash },
    { label: t('admin.autoPods.colMode'), value: virtual ? labels.modeVirtual : labels.modePhysical },
    { label: t('admin.autoPods.colLocation'), value: city || t('admin.autoPods.anyCity') },
    {
      label: labels.priceLabel,
      value: row.pod_amount > 0 ? formatMoney(row.pod_amount) : labels.pricedByHost,
    },
    {
      label: labels.spotsLabel,
      value: row.no_of_spots > 0 ? String(row.no_of_spots) : labels.pricedByHost,
    },
    { label: t('admin.autoPods.summaryWhen'), value: when || venueWhen || empty },
    ...(virtual ? [{ label: t('admin.autoPods.summaryMeeting'), value: meetingValue(row, t) }] : []),
    { label: t('admin.autoPods.summaryDescription'), value: row.pod_description || dash },
    { label: t('admin.autoPods.summaryInfo'), value: row.pod_info || dash },
    { label: t('admin.autoPods.summaryHashtags'), value: <ChipList items={row.pod_hashtag} empty={dash} /> },
    {
      label: t('admin.autoPods.summaryOffers'),
      value: <ChipList items={row.what_this_pod_offers} empty={dash} />,
    },
    { label: t('admin.autoPods.summaryPerks'), value: <ChipList items={row.available_perks} empty={dash} /> },
    {
      label: t('admin.autoPods.summaryMedia'),
      value: t('admin.autoPods.summaryMediaCount', {
        vars: { n: row.pod_images_and_videos.length },
      } as never),
    },
    ...(row.cancel_reason
      ? [{ label: t('admin.autoPods.summaryCancelReason'), value: row.cancel_reason }]
      : []),
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('admin.autoPods.summaryTitle')}
        </Typography>
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {rows.map((summary) => (
            <InfoRow
              key={summary.label}
              label={summary.label}
              value={
                <Typography component="div" variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {summary.value}
                </Typography>
              }
              variant="stacked"
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
