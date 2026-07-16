import { useWindowDimensions } from 'react-native';
import { ScrollView, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { AdCard } from '@/components/ads/AdCard';
import { interleaveAds, isAdEntry } from '@/components/ads/interleaveAds';
import { PodCard } from '@/components/home/PodCard';
import { StackScreen } from '@/components/StackScreen';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useHomeFeed } from '@/hooks/useHomeFeed';

/** Dedicated page of every live (upcoming) pod for the selected city/super-
 * category — reached from the Home "Happening nearby" section (title or See all). */
export function HappeningNearbyScreen() {
  const { width } = useWindowDimensions();
  const { activePods } = useHomeFeed('');
  const { openPod } = useDetailNav();
  // A full-width sponsored banner every 4 live pods.
  const { ads } = useActiveAds('POD_LIST');

  return (
    <StackScreen title="Happening nearby" testID="happening-nearby-screen">
      {activePods.length === 0 ? (
        <Text testID="happening-nearby-empty" textAlign="center" color="$muted" padding={24}>
          No live pods around you right now.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={12} padding={16} paddingBottom={40}>
            {interleaveAds(activePods, ads, 4).map((entry, index) => {
              if (isAdEntry(entry)) {
                return (
                  <Reveal key={entry.key} index={index} scale>
                    <AdCard ad={entry.ad} variant="banner" />
                  </Reveal>
                );
              }
              const pod = entry.item;
              return (
                <Reveal key={pod.id} index={index} scale>
                  <PodCard
                    pod={pod}
                    width={width - 32}
                    onPress={() => openPod(pod.id, pod.pod_title)}
                  />
                </Reveal>
              );
            })}
          </YStack>
        </ScrollView>
      )}
    </StackScreen>
  );
}
