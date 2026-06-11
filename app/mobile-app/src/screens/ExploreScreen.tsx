import { TabScreen } from '@/components/TabScreen';
import { ExploreReels } from '@/components/explore/ExploreReels';

/** Explore tab — a vertical Reels feed of pods (mWeb's ExplorePage). */
export function ExploreScreen() {
  return (
    <TabScreen testID="explore-screen">
      <ExploreReels />
    </TabScreen>
  );
}
