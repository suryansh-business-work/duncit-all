import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { HomePod } from '@/hooks/useHomeFeed';
import { Reveal } from '@/animations/Reveal';
import { PodCard } from '@/components/home/PodCard';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  pods: HomePod[];
  onOpenPod: (pod: HomePod) => void;
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
 * is why nothing here offers a join. mWeb twin: OngoingPodsRail.
 */
export function OngoingPodsRail({ pods, onOpenPod }: Readonly<Props>) {
  const { t } = useTranslation();
  if (pods.length === 0) return null;

  return (
    <YStack gap={10} testID="ongoing-pods-rail">
      <XStack alignItems="center" gap={8} paddingHorizontal={16}>
        <MaterialIcons name="sensors" size={20} color={semantic.success} />
        <YStack flex={1}>
          <Text fontSize={16} fontWeight="700" color="$color">
            {t('mweb.home.ongoingPodsTitle')}
          </Text>
          <Text fontSize={12} fontWeight="700" color="$muted">
            {t('mweb.home.ongoingPodsSubtitle')}
          </Text>
        </YStack>
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {pods.map((pod, index) => (
          <Reveal key={pod.id} index={index} scale>
            <PodCard pod={pod} width={300} onPress={() => onOpenPod(pod)} />
          </Reveal>
        ))}
      </ScrollView>
    </YStack>
  );
}
