import { Stack } from '@mui/material';
import { useNavigate } from 'react-router';
import PodCard from './PodCard';
import HomeRail from './HomeRail';
import SectionHeader from '../../components/SectionHeader';
import { openPod } from '../../lib/open-pod';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pods: any[];
  hostNameOf: (pod: any) => string | null;
}

/**
 * The rail for pods that are RUNNING right now — started, not yet finished.
 *
 * These used to fall straight into Previous Pods the moment they began, which
 * read as "already over" while the pod still had hours left. They get their own
 * band instead, and only move to Previous once their end time passes.
 *
 * There is no See-all: the band is bounded by the pods' own end times, not by a
 * page size, so a link to a fuller list would have nothing extra to show.
 * Cards open the pod detail as everywhere else — where booking is closed, which
 * is why nothing here offers a join.
 */
export default function OngoingPodsRail({ pods, hostNameOf }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (pods.length === 0) return null;

  return (
    <Stack spacing={1.5} data-testid="ongoing-pods-rail">
      <SectionHeader title={t('mweb.home.ongoingPodsTitle')} />
      <HomeRail>
        {pods.map((pod: any) => (
          <PodCard
            key={pod.id}
            pod={pod}
            hostName={hostNameOf(pod)}
            onOpen={() => openPod(navigate, pod)}
          />
        ))}
      </HomeRail>
    </Stack>
  );
}
