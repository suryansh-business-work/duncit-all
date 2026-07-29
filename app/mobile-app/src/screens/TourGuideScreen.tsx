import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { isTourCompleted, toursForRoles, type TourId } from '@duncit/tours';

import { StackScreen } from '@/components/StackScreen';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToursStore } from '@/stores/tours.store';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Tour Guide centre — every guided walkthrough, restartable at any time. The
 * list comes from @duncit/tours, so adding a screen's tour is one registry
 * entry and it shows up here and in mWeb's centre with no change to either.
 */
export function TourGuideScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted, primary } = useThemeColors();
  const completed = useToursStore((s) => s.completed);
  const startTour = useToursStore((s) => s.startTour);
  // Create Pod walks through a screen a non-host cannot open.
  const tours = toursForRoles(useMe().data?.me?.roles ?? []);

  const run = (id: TourId, route: string) => {
    startTour(id);
    navigation.navigate(route as keyof RootStackParamList as never);
  };

  return (
    <StackScreen title="Tour Guide" testID="tour-guide-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={12} padding={16} paddingBottom={40}>
          <Text fontSize={13} color="$muted">
            Take a guided walkthrough of any screen, as often as you like.
          </Text>
          {tours.map((tour) => {
            const done = isTourCompleted(completed, tour.id);
            return (
              <XStack
                key={tour.id}
                testID={`tour-row-${tour.id}`}
                role="button"
                aria-label={`${done ? 'Restart' : 'Start'} the ${tour.title} tour`}
                onPress={() => run(tour.id, tour.nativeRoute)}
                alignItems="center"
                gap={12}
                padding={14}
                borderRadius={14}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
                pressStyle={{ opacity: 0.85 }}
              >
                <MaterialIcons name={done ? 'replay' : 'play-arrow'} size={22} color={primary} />
                <YStack flex={1} gap={2}>
                  <Text fontSize={14} fontWeight="800" color="$color">
                    {tour.title}
                  </Text>
                  <Text fontSize={12} color="$muted">
                    {tour.caption}
                  </Text>
                </YStack>
                {done ? (
                  <Text
                    testID={`tour-done-${tour.id}`}
                    fontSize={11}
                    fontWeight="800"
                    color="$muted"
                  >
                    Completed
                  </Text>
                ) : null}
                <MaterialIcons name="chevron-right" size={20} color={muted} />
              </XStack>
            );
          })}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
