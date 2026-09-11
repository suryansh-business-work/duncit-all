import { Stack } from '@mui/material';
import { useNavigate } from 'react-router';
import PodCard from './PodCard';
import HomeRail from './HomeRail';
import SeeAllCard from './SeeAllCard';
import SectionHeader from '../../components/SectionHeader';
import { openPod } from '../../lib/open-pod';
import { useTranslation } from '../../i18n/useTranslation';

/** Max entries shown on the home rail before the See-all card takes over. */
const RAIL_CAP = 10;

interface Props {
  pods: any[];
  hostNameOf: (pod: any) => string | null;
  /** True while a vibe chip / sheet filter narrows the rail: the full page is
   * unfiltered, so the card drops its count and its jump-to-index. */
  filtered: boolean;
}

/** Bottom-of-home rail of pods whose date has already passed, with a "See all"
 * link to the dedicated Previous Pods page (bug 8). Hidden when there are none. */
export default function PreviousPodsRail({ pods, hostNameOf, filtered }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (pods.length === 0) return null;

  return (
    <Stack spacing={1.5}>
      <SectionHeader
        title={t('mweb.home.previousPodsTitle')}
        actionLabel={t('mweb.home.seeAll')}
        onAction={() => navigate('/previous-pods')}
      />
      <HomeRail>
        {pods.slice(0, RAIL_CAP).map((pod: any) => (
          <PodCard
            key={pod.id}
            pod={pod}
            hostName={hostNameOf(pod)}
            onOpen={() => openPod(navigate, pod)}
          />
        ))}
        {pods.length > RAIL_CAP && (
          <SeeAllCard
            count={filtered ? undefined : pods.length - RAIL_CAP}
            width={200}
            onClick={() => navigate(filtered ? '/previous-pods' : `/previous-pods?from=${RAIL_CAP}`)}
          />
        )}
      </HomeRail>
    </Stack>
  );
}
