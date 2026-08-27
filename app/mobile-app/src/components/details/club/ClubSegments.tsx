import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { useMemo, useState } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { TourAnchor } from '@/tours/TourAnchor';
import type { ClubDetail, ClubPod } from '@/hooks/useDetails';
import type { ClubMoment } from '@/utils/club-detail';
import { ClubAdminsSection } from './ClubAdminsSection';
import { ClubBulletsSection } from './ClubBulletsSection';
import { ClubFaqsSection } from './ClubFaqsSection';
import { ClubHostsRail } from './ClubHostsRail';
import { ClubMomentsRail } from './ClubMomentsRail';
import { ClubPodsSchedule } from './ClubPodsSchedule';
import { PRESS_STYLE } from '@duncit/buttons-native';

type SegmentKey =
  'PODS' | 'MOMENTS' | 'WHO' | 'WHAT' | 'PERKS' | 'VALUES' | 'FAQS' | 'HOSTS' | 'ADMINS';

interface Props {
  club: ClubDetail;
  pods: ClubPod[];
  moments: ClubMoment[];
  onOpenPod: (pod: ClubPod) => void;
  onOpenHost: (id: string) => void;
}

function segmentContent(active: SegmentKey, ctx: Props, t: Translate) {
  if (active === 'MOMENTS') return <ClubMomentsRail moments={ctx.moments} />;
  if (active === 'WHO')
    return <ClubBulletsSection title={t('mweb.common.whoWeAre')} items={ctx.club.who_we_are} />;
  if (active === 'WHAT')
    return <ClubBulletsSection title={t('mweb.common.whatWeDo')} items={ctx.club.what_we_do} />;
  if (active === 'PERKS')
    return <ClubBulletsSection title={t('mweb.common.perks')} items={ctx.club.perks} />;
  if (active === 'VALUES')
    return <ClubBulletsSection title={t('mweb.common.values')} items={ctx.club.values} />;
  if (active === 'FAQS') return <ClubFaqsSection faqs={ctx.club.faqs} />;
  if (active === 'HOSTS')
    return <ClubHostsRail hosts={ctx.club.hosts} onOpenHost={ctx.onOpenHost} />;
  if (active === 'ADMINS') return <ClubAdminsSection admins={ctx.club.club_admins} />;
  const schedule = <ClubPodsSchedule pods={ctx.pods} onOpenPod={ctx.onOpenPod} />;
  // The anchor goes HERE and not inside ClubPodsSchedule, which Venue Details
  // renders too: an anchor in the shared component registers on the venue screen
  // as well, and a club tour armed while the user browses venues would open
  // there — one step, over a heading that reads "Pods at this venue".
  // A club with nothing scheduled has nothing to spotlight, so it is left out.
  if (ctx.pods.length === 0) return schedule;
  return (
    <TourAnchor tour="club" anchor="club-pods">
      {schedule}
    </TourAnchor>
  );
}

/** The tabbed Club Detail segments — Pods Schedule, Club Moments, the admin
 * content sections and Club Hosts. Empty segments are hidden. */
export function ClubSegments(props: Readonly<Props>) {
  const { t } = useTranslation();
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
      ['ADMINS', 'Club Admins', club.club_admins.length > 0],
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
              pressStyle={PRESS_STYLE.control}
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
              <Text fontSize={13} fontWeight="700" color={isActive ? '$onPrimary' : '$color'}>
                {label}
              </Text>
            </XStack>
          );
        })}
      </ScrollView>
      {segmentContent(active, props, t)}
    </YStack>
  );
}
