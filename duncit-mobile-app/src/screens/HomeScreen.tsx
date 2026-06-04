import { TabScreen } from '@/components/TabScreen';
import { HomeFeed } from '@/components/home/HomeFeed';

/** Authenticated home — the shared tab scaffold (gradient + header) above the
 * live pod feed. RN counterpart of mWeb's HomePage. */
export function HomeScreen() {
  return (
    <TabScreen testID="home-screen">
      <HomeFeed />
    </TabScreen>
  );
}
