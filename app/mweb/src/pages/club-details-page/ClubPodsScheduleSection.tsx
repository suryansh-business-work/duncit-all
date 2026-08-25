import { Alert, Box, Stack, Typography } from '@mui/material';
import { clubPodPhase, type ClubPodPhase } from '../../utils/clubPodPhase';
import ClubPodRailCard from './ClubPodRailCard';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pods: any[];
  priceFormat: (value: number) => string;
  onOpen: (id: string) => void;
}

const RAILS: ReadonlyArray<readonly [ClubPodPhase, string]> = [
  ['SOON', 'Happening soon'],
  ['UPCOMING', 'Upcoming'],
  ['PREVIOUS', 'Previous'],
];

function PodRail({ title, pods, priceFormat, onOpen }: Readonly<Props & { title: string }>) {
  if (pods.length === 0) return null;
  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          mb: 0.75
        }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        {pods.map((pod) => (
          <ClubPodRailCard key={pod.id} pod={pod} priceFormat={priceFormat} onOpen={onOpen} />
        ))}
      </Stack>
    </Box>
  );
}

/** Pods Schedule segment — Happening Soon / Upcoming / Previous, each a side-by-side swipe rail. */
export default function ClubPodsScheduleSection({ pods, priceFormat, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const byPhase = (phase: ClubPodPhase) =>
    pods.filter((pod) => clubPodPhase(pod.pod_date_time, pod.pod_end_date_time) === phase);

  if (pods.length === 0) {
    return <Alert severity="info">{t('mweb.clubDetails.noPodsScheduledForThisClub')}</Alert>;
  }

  return (
    <Stack spacing={2}>
      {RAILS.map(([phase, title]) => (
        <PodRail key={phase} title={title} pods={byPhase(phase)} priceFormat={priceFormat} onOpen={onOpen} />
      ))}
    </Stack>
  );
}
