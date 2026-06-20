import { useMemo, useState } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import ClubPodsScheduleSection from './ClubPodsScheduleSection';
import ClubMomentsSection from './ClubMomentsSection';
import ClubBulletsSection from './ClubBulletsSection';
import ClubFaqsSection from './ClubFaqsSection';
import ClubHostsSection from './ClubHostsSection';

type SegmentKey = 'PODS' | 'MOMENTS' | 'WHO' | 'WHAT' | 'PERKS' | 'VALUES' | 'FAQS' | 'HOSTS';

interface Props {
  club: any;
  pods: any[];
  priceFormat: (value: number) => string;
  onOpenPod: (id: string) => void;
}

interface RenderCtx extends Props {
  moments: any[];
}

/** Random sample of the club's pods' media — the Club Moments segment. */
export const pickPodMoments = (pods: any[], limit: number) => {
  const all = pods.flatMap((pod) => pod.pod_images_and_videos ?? []);
  return [...all].sort(() => Math.random() - 0.5).slice(0, limit);
};

function renderSegment(active: SegmentKey, ctx: RenderCtx) {
  if (active === 'MOMENTS') return <ClubMomentsSection moments={ctx.moments} />;
  if (active === 'WHO') return <ClubBulletsSection title="Who We Are" items={ctx.club.who_we_are ?? []} />;
  if (active === 'WHAT') return <ClubBulletsSection title="What We Do" items={ctx.club.what_we_do ?? []} />;
  if (active === 'PERKS') return <ClubBulletsSection title="Perks" items={ctx.club.perks ?? []} />;
  if (active === 'VALUES') return <ClubBulletsSection title="Values" items={ctx.club.values ?? []} />;
  if (active === 'FAQS') return <ClubFaqsSection faqs={ctx.club.faqs ?? []} />;
  if (active === 'HOSTS') return <ClubHostsSection hosts={ctx.club.hosts ?? []} />;
  return <ClubPodsScheduleSection pods={ctx.pods} priceFormat={ctx.priceFormat} onOpen={ctx.onOpenPod} />;
}

/** The tabbed Club Detail segments (Pods Schedule, Club Moments, content sections, hosts). */
export default function ClubSegments({ club, pods, priceFormat, onOpenPod }: Readonly<Props>) {
  const moments = useMemo(() => pickPodMoments(pods, 12), [pods]);
  const segments = useMemo(() => {
    const all: ReadonlyArray<readonly [SegmentKey, string, boolean]> = [
      ['PODS', 'Pods Schedule', true],
      ['MOMENTS', 'Club Moments', moments.length > 0],
      ['WHO', 'Who We Are', (club.who_we_are ?? []).length > 0],
      ['WHAT', 'What We Do', (club.what_we_do ?? []).length > 0],
      ['PERKS', 'Perks', (club.perks ?? []).length > 0],
      ['VALUES', 'Values', (club.values ?? []).length > 0],
      ['FAQS', 'FAQs', (club.faqs ?? []).length > 0],
      ['HOSTS', 'Club Hosts', (club.hosts ?? []).length > 0],
    ];
    return all.filter(([, , available]) => available);
  }, [club, moments.length]);
  const [active, setActive] = useState<SegmentKey>('PODS');

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {segments.map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            clickable
            color={active === key ? 'primary' : 'default'}
            variant={active === key ? 'filled' : 'outlined'}
            onClick={() => setActive(key)}
            sx={{ height: 34, fontWeight: 900 }}
          />
        ))}
      </Stack>
      <Box>{renderSegment(active, { club, pods, moments, priceFormat, onOpenPod })}</Box>
    </Stack>
  );
}
