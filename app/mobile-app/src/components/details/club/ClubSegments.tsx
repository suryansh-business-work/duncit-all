import { useMemo, useState } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { ClubDetail, ClubPod } from '@/hooks/useDetails';
import type { ClubMoment } from '@/utils/club-detail';
import { ClubBulletsSection } from './ClubBulletsSection';
import { ClubFaqsSection } from './ClubFaqsSection';
import { ClubHostsRail } from './ClubHostsRail';
import { ClubMomentsRail } from './ClubMomentsRail';
import { ClubPodsSchedule } from './ClubPodsSchedule';

type SegmentKey = 'PODS' | 'MOMENTS' | 'WHO' | 'WHAT' | 'PERKS' | 'VALUES' | 'FAQS' | 'HOSTS';

interface Props {
  club: ClubDetail;
  pods: ClubPod[];
  moments: ClubMoment[];
  onOpenPod: (pod: ClubPod) => void;
  onOpenHost: (id: string) => void;
}

function segmentContent(active: SegmentKey, ctx: Props) {
  if (active === 'MOMENTS') return <ClubMomentsRail moments={ctx.moments} />;
  if (active === 'WHO')
    return <ClubBulletsSection title="Who We Are" items={ctx.club.who_we_are} />;
  if (active === 'WHAT')
    return <ClubBulletsSection title="What We Do" items={ctx.club.what_we_do} />;
  if (active === 'PERKS') return <ClubBulletsSection title="Perks" items={ctx.club.perks} />;
  if (active === 'VALUES') return <ClubBulletsSection title="Values" items={ctx.club.values} />;
  if (active === 'FAQS') return <ClubFaqsSection faqs={ctx.club.faqs} />;
  if (active === 'HOSTS')
    return <ClubHostsRail hosts={ctx.club.hosts} onOpenHost={ctx.onOpenHost} />;
  return <ClubPodsSchedule pods={ctx.pods} onOpenPod={ctx.onOpenPod} />;
}

/** The tabbed Club Detail segments — Pods Schedule, Club Moments, the admin
 * content sections and Club Hosts. Empty segments are hidden. */
export function ClubSegments(props: Readonly<Props>) {
  const { club, moments } = props;
  const segments = useMemo(() => {
    const all: readonly (readonly [SegmentKey, string, boolean])[] = [
      ['PODS', 'Pods Schedule', true],
      ['MOMENTS', 'Club Moments', moments.length > 0],
      ['WHO', 'Who We Are', club.who_we_are.length > 0],
      ['WHAT', 'What We Do', club.what_we_do.length > 0],
      ['PERKS', 'Perks', club.perks.length > 0],
      ['VALUES', 'Values', club.values.length > 0],
      ['FAQS', 'FAQs', club.faqs.length > 0],
      ['HOSTS', 'Club Hosts', club.hosts.length > 0],
    ];
    return all.filter(([, , available]) => available);
  }, [club, moments.length]);
  const [active, setActive] = useState<SegmentKey>('PODS');

  return (
    <YStack gap={14} testID="club-segments">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {segments.map(([key, label]) => {
          const isActive = active === key;
          return (
            <XStack
              key={key}
              testID={`club-tab-${key}`}
              role="button"
              aria-label={label}
              onPress={() => setActive(key)}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={999}
              borderWidth={1}
              borderColor={isActive ? '$primary' : '$borderColor'}
              backgroundColor={isActive ? '$primary' : 'transparent'}
            >
              <Text fontSize={13} fontWeight="900" color={isActive ? '$onPrimary' : '$color'}>
                {label}
              </Text>
            </XStack>
          );
        })}
      </ScrollView>
      {segmentContent(active, props)}
    </YStack>
  );
}
