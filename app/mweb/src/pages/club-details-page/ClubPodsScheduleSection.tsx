import { Box, Stack } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { clubPodPhase, type ClubPodPhase } from '../../utils/clubPodPhase';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
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
    <Stack spacing={1.25}>
      <SectionHeader title={title} />
      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        {pods.map((pod) => (
          <ClubPodRailCard key={pod.id} pod={pod} priceFormat={priceFormat} onOpen={onOpen} />
        ))}
      </Box>
    </Stack>
  );
}

/** Pods Schedule segment — Happening Soon / Upcoming / Previous, each a side-by-side swipe rail. */
export default function ClubPodsScheduleSection({ pods, priceFormat, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const byPhase = (phase: ClubPodPhase) =>
    pods.filter((pod) => clubPodPhase(pod.pod_date_time, pod.pod_end_date_time) === phase);

  if (pods.length === 0) {
    return <EmptyState icon={<EventBusyOutlinedIcon />} title={t('mweb.clubDetails.noPodsScheduledForThisClub')} />;
  }

  return (
    <Stack spacing={2.5}>
      {RAILS.map(([phase, title]) => (
        <PodRail key={phase} title={title} pods={byPhase(phase)} priceFormat={priceFormat} onOpen={onOpen} />
      ))}
    </Stack>
  );
}
