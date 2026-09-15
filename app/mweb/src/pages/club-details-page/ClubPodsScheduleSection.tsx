import { Stack } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { ScrollRail } from '@duncit/ui';
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
    <Stack data-testid={`club-pods-schedule-rail-${title}`} spacing={1.25}>
      <SectionHeader testId={`club-pods-schedule-rail-${title}-header`} title={title} />
      <ScrollRail testId={`club-pods-schedule-rail-${title}-scroll`} gap={1.5}>
        {pods.map((pod) => (
          <ClubPodRailCard key={pod.id} pod={pod} priceFormat={priceFormat} onOpen={onOpen} />
        ))}
      </ScrollRail>
    </Stack>
  );
}

/** Pods Schedule segment — Happening Soon / Upcoming / Previous, each a side-by-side swipe rail. */
export default function ClubPodsScheduleSection({ pods, priceFormat, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const byPhase = (phase: ClubPodPhase) =>
    pods.filter((pod) => clubPodPhase(pod.pod_date_time, pod.pod_end_date_time) === phase);

  if (pods.length === 0) {
    return <EmptyState testId="club-no-pods" icon={<EventBusyOutlinedIcon />} title={t('mweb.clubDetails.noPodsScheduledForThisClub')} />;
  }

  return (
    <Stack data-testid="club-pods-schedule" spacing={2.5}>
      {RAILS.map(([phase, title]) => (
        <PodRail key={phase} title={title} pods={byPhase(phase)} priceFormat={priceFormat} onOpen={onOpen} />
      ))}
    </Stack>
  );
}
