import { useWindowDimensions } from 'react-native';
import { ScrollView, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { PodCard } from '@/components/home/PodCard';
import { StackScreen } from '@/components/StackScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeFeed } from '@/hooks/useHomeFeed';

/** Dedicated page of pods that have already taken place (past date) for the
 * selected city/super-category — reached from the Home "Previous Pods" section. */
export function PreviousPodsScreen() {
  const { width } = useWindowDimensions();
  const { previousPods } = useHomeFeed('');
  const { openPod } = useDetailNav();

  return (
    <StackScreen title="Previous Pods" testID="previous-pods-screen">
      {previousPods.length === 0 ? (
        <Text testID="previous-pods-empty" textAlign="center" color="$muted" padding={24}>
          No previous pods to show yet.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={12} padding={16} paddingBottom={40}>
            {previousPods.map((pod, index) => (
              <Reveal key={pod.id} index={index} scale>
                <PodCard
                  pod={pod}
                  width={width - 32}
                  onPress={() => openPod(pod.id, pod.pod_title)}
                />
              </Reveal>
            ))}
          </YStack>
        </ScrollView>
      )}
    </StackScreen>
  );
}
