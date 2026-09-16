import { showsWaitlist } from '@duncit/utils';

import { TabScreen } from '@/components/TabScreen';
import { CityLaunchView } from '@/components/city-launch';
import { HomeFeed } from '@/components/home/HomeFeed';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useLocations } from '@/hooks/useLocations';

/** Authenticated home — the shared tab scaffold (gradient + header) above the
 * live pod feed, or above the launch waitlist when the chosen city is not live
 * yet. RN counterpart of mWeb's HomePage. */
export function HomeScreen() {
  const { locations, selectedId } = useLocations();
  const bottomSpace = useBottomNavSpace();
  const selected = locations.find((loc) => loc.id === selectedId);

  return (
    <TabScreen testID="home-screen">
      {selected && showsWaitlist(selected) ? (
        <CityLaunchView locationId={selected.id} bottomSpace={bottomSpace} />
      ) : (
        <HomeFeed />
      )}
    </TabScreen>
  );
}
