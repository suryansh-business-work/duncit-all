import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { isTourCompleted, toursForRoles, type TourDefinition } from '@duncit/tours';

import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToursStore } from '@/stores/tours.store';
import type { TabParamList } from '@/navigation/tabs';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** One walkthrough: a play (or replay) disc, the title and what it covers, a
 * Completed pill once shown, and the chevron. mWeb twin: TourRow on the
 * tour-guide page. */
function TourRow({
  tour,
  done,
  onStart,
}: Readonly<{ tour: TourDefinition; done: boolean; onStart: () => void }>) {
  const { t } = useTranslation();
  const { muted, primary } = useThemeColors();
  const name = t(tour.titleKey);
  return (
    <XStack
      testID={`tour-row-${tour.id}`}
      role="button"
      aria-label={
        done
          ? t('mweb.tourGuide.restartAria', { vars: { name } })
          : t('mweb.tourGuide.startAria', { vars: { name } })
      }
      onPress={onStart}
      alignItems="center"
      gap={12}
      paddingHorizontal={16}
      paddingVertical={14}
      pressStyle={PRESS_STYLE.row}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primarySoft"
      >
        <MaterialIcons name={done ? 'replay' : 'play-arrow'} size={20} color={primary} />
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="500" color="$color">
          {name}
        </Text>
        <Text fontSize={12} color="$muted">
          {t(tour.captionKey)}
        </Text>
      </YStack>
      {done ? (
        <Text
          testID={`tour-done-${tour.id}`}
          fontSize={11}
          fontWeight="600"
          color="$success"
          backgroundColor="$successSoft"
          borderRadius={999}
          paddingHorizontal={8}
          paddingVertical={3}
          overflow="hidden"
        >
          {t('mweb.tourGuide.completed')}
        </Text>
      ) : null}
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </XStack>
  );
}

/**
 * Tour Guide centre — every guided walkthrough, restartable at any time. The
 * list comes from @duncit/tours, so adding a screen's tour is one registry
 * entry and it shows up here and in mWeb's centre with no change to either.
 */
export function TourGuideScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const completed = useToursStore((s) => s.completed);
  const startTour = useToursStore((s) => s.startTour);
  // Create Pod walks through a screen a non-host cannot open.
  const tours = toursForRoles(useMe().data?.me?.roles ?? []);

  // A tour whose landing is a bottom tab has to be navigated to THROUGH the tab
  // navigator, which is the 'Home' route — `navigate('Clubs')` finds no such
  // screen on the root stack and leaves the user where they were. That is how
  // the Club tour used to drop native users on the home feed while mWeb opened
  // /clubs.
  const run = (tour: TourDefinition) => {
    startTour(tour.id);
    if (tour.nativeTab) {
      navigation.navigate('Home', { screen: tour.nativeTab as keyof TabParamList });
      return;
    }
    navigation.navigate(tour.nativeRoute as never);
  };

  return (
    <StackScreen title={t('mweb.tourGuide.tourGuide')} testID="tour-guide-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack padding={16} paddingBottom={40}>
          <SurfaceCard padding={0} overflow="hidden">
            {tours.map((tour, index) => (
              <YStack key={tour.id}>
                {index > 0 ? <Separator borderColor="$borderColor" marginHorizontal={16} /> : null}
                <TourRow
                  tour={tour}
                  done={isTourCompleted(completed, tour.id)}
                  onStart={() => run(tour)}
                />
              </YStack>
            ))}
          </SurfaceCard>
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
