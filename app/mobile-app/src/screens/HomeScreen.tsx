import { TabScreen } from '@/components/TabScreen';
import { CityLaunchView } from '@/components/city-launch';
import { HomeFeed } from '@/components/home/HomeFeed';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import { useComingSoonCity } from '@/hooks/useComingSoonCity';
import { useLocations } from '@/hooks/useLocations';

/** Authenticated home — the shared tab scaffold (gradient + header) above the
 * live pod feed, or above the launch waitlist when the chosen city is not live
 * yet (no bottom nav there, so only the system inset is reserved). RN
 * counterpart of mWeb's HomePage. */
export function HomeScreen() {
  const { selectedId } = useLocations();
  const comingSoon = useComingSoonCity();
  const bottomInset = useBottomInset();

  return (
    <TabScreen testID="home-screen">
      {selectedId && comingSoon ? (
        <CityLaunchView locationId={selectedId} bottomSpace={bottomInset} />
      ) : (
        <HomeFeed />
      )}
    </TabScreen>
  );
}
