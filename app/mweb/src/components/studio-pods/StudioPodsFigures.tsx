import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import FigureTile from './FigureTile';
import { fillPercent } from './summary';
import type { StudioPodSummary } from './types';

interface Figure {
  key: string;
  label: string;
  value: string;
}

interface Props {
  summary: StudioPodSummary;
  /** Already-translated word for what the figures cover — Venues or Clubs. */
  scopeLabel: string;
}

/**
 * The figures strip above a studio's pod list: every number the server already
 * exposes, so a partner reads their pods as data rather than as a list of names.
 *
 * Shared by Venue Studio and Club Studio (rule 34) — the collected-money tile is
 * simply absent on the venue side, whose query exposes no revenue.
 */
export default function StudioPodsFigures({ summary, scopeLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  // Date AND time: a studio owner needs to know WHEN the next pod starts, and
  // native already showed both (rule 27).
  const { formatDateTime } = useDateFormat();
  const pct = fillPercent(summary);

  const nextPod = summary.next_pod_date_time
    ? formatDateTime(summary.next_pod_date_time)
    : t('mweb.studioPods.noneScheduled');

  const figures: Figure[] = [
    { key: 'scope', label: scopeLabel, value: String(summary.scope_count) },
    { key: 'total', label: t('mweb.studioPods.total'), value: String(summary.total) },
    {
      key: 'upcoming',
      label: t('mweb.studioPods.bucketUpcoming'),
      value: String(summary.upcoming),
    },
    { key: 'live', label: t('mweb.studioPods.bucketLive'), value: String(summary.ongoing) },
    { key: 'past', label: t('mweb.studioPods.bucketPast'), value: String(summary.completed) },
    {
      key: 'cancelled',
      label: t('mweb.studioPods.bucketCancelled'),
      value: String(summary.cancelled),
    },
    {
      key: 'spots',
      label: t('mweb.studioPods.spotsFilled'),
      value: `${summary.filled_spots}/${summary.total_spots}`,
    },
    {
      key: 'attendees',
      label: t('mweb.studioPods.attendees'),
      value: String(summary.total_attendees),
    },
    { key: 'next', label: t('mweb.studioPods.nextPod'), value: nextPod },
  ];

  if (summary.total_revenue !== null) {
    figures.push({
      key: 'collected',
      label: t('mweb.studioPods.collected'),
      value: formatMoney(summary.total_revenue, { symbol: summary.currency_symbol }),
    });
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {figures.map((figure) => (
          <FigureTile key={figure.key} label={figure.label} value={figure.value} />
        ))}
      </Stack>
      <Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, pct)}
          sx={{ height: 8, borderRadius: 999 }}
          aria-label={t('mweb.studioPods.spotsFilled')}
        />
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600
          }}>
          {t('mweb.studioPods.fillRate', { vars: { pct } })}
        </Typography>
      </Box>
    </Stack>
  );
}
