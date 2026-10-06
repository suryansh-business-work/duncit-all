import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { logs } from '@duncit/logs';
import { ScrollRail } from '@duncit/ui';
import SectionHeader from '../SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import PublicReelTile from './PublicReelTile';
import { PUBLIC_POD_REELS, type PublicReelPod } from './queries';
import { useOpenPod } from './useOpenPod';

type Props = Readonly<{ venueId: string; hostUserId?: never } | { hostUserId: string; venueId?: never }>;

const hasReel = (pod: PublicReelPod): pod is PublicReelPod & { reel_url: string } => Boolean(pod.reel_url);

/**
 * The Reels row of a public venue or host page — every live pod there with a
 * reel. Hidden while loading and when there are none; a failed load hides it
 * too (the page's own details still stand) and is logged.
 */
export default function PublicReelsSection({ venueId, hostUserId }: Props) {
  const { t } = useTranslation();
  const openPod = useOpenPod();
  const { data, error } = useQuery<{ pods: PublicReelPod[] }>(PUBLIC_POD_REELS, {
    variables: { venueId: venueId ?? null, hostUserId: hostUserId ?? null },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (error) logs.mWeb.warn('PublicReelsSection', 'pods', { error });
  }, [error]);

  const reels = (data?.pods ?? []).filter(hasReel);
  if (reels.length === 0) return null;

  return (
    <Stack spacing={1.25} data-testid="public-reels-section">
      <SectionHeader testId="public-reels-section-header" title={t('publicPage.reels.title')} />
      <ScrollRail testId="public-reels-section-rail" gap={1.5}>
        {reels.map((pod) => (
          <PublicReelTile key={pod.id} pod={pod} onOpen={openPod} />
        ))}
      </ScrollRail>
    </Stack>
  );
}
