import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import { BUCKET_LABEL_KEY, BUCKET_TONE, podFillPercent } from './summary';
import type { StudioPod } from './types';

/** One `Label  Value` fact under a row. Hoisted, so it is never redefined. */
function PodFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }} noWrap>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
        {value}
      </Typography>
    </Stack>
  );
}

interface Props {
  pod: StudioPod;
  /** Symbol the surface's own money figures use, so a row never guesses. */
  currencySymbol: string;
}

/**
 * One pod row, identical in Venue Studio and Club Studio: what it is, when it
 * runs, who hosts it, how full it is and what a seat costs — not just a name.
 */
export default function StudioPodRow({ pod, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  const hosts = pod.host_names.filter(Boolean).join(', ');
  const hostValue = hosts || t('mweb.studioPods.hostsNone');

  return (
    <Stack
      spacing={0.75}
      sx={{
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }} noWrap>
          {pod.pod_title}
        </Typography>
        <Chip
          size="small"
          label={t(BUCKET_LABEL_KEY[pod.bucket])}
          color={BUCKET_TONE[pod.bucket]}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
        <EventIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" noWrap sx={{ flex: 1 }}>
          {formatDateTime(pod.pod_date_time)} · {pod.owner_name}
        </Typography>
      </Stack>

      <PodFact label={t('mweb.studioPods.hosts')} value={hostValue} />

      <Box>
        <LinearProgress
          variant="determinate"
          value={podFillPercent(pod)}
          sx={{ height: 6, borderRadius: 999 }}
          aria-label={t('mweb.studioPods.spots')}
        />
      </Box>

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
        <PodFact
          label={t('mweb.studioPods.spots')}
          value={`${pod.attendee_count}/${pod.no_of_spots}`}
        />
        <PodFact label={t('mweb.studioPods.people')} value={String(pod.pod_attendees.length)} />
        <PodFact
          label={t('mweb.studioPods.ticket')}
          value={formatMoney(pod.pod_amount, { symbol: currencySymbol })}
        />
      </Stack>
    </Stack>
  );
}
