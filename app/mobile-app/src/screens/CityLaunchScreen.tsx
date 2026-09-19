import { useRoute, type RouteProp } from '@react-navigation/native';
import { YStack } from 'tamagui';

import { CityLaunchView } from '@/components/city-launch';
import { StackScreen } from '@/components/StackScreen';
import { useLocations } from '@/hooks/useLocations';
import type { RootStackParamList } from '@/navigation/types';

/** Room under the last card: a pushed screen has no floating tab bar. */
const STACK_BOTTOM_SPACE = 40;

/**
 * /city-launch/:locationId — a not-yet-launched city's waitlist on its own,
 * behind a back header named for the city: the link "Send this to your
 * friends" hands out. RN twin of mWeb's CityLaunchPage (rule 27); the header's
 * `-back` / `-title` test ids come from StackScreen.
 */
export function CityLaunchScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'CityLaunch'>>();
  const { locations } = useLocations();
  // A shared link carries the city's slug; links shared before it carry the id.
  const city =
    locations.find((loc) => loc.location_id === params.locationId || loc.id === params.locationId)
      ?.location_name ?? '';

  return (
    <YStack flex={1} testID="city-launch-page">
      <StackScreen title={city} testID="city-launch-header">
        <CityLaunchView locationId={params.locationId} bottomSpace={STACK_BOTTOM_SPACE} />
      </StackScreen>
    </YStack>
  );
}
