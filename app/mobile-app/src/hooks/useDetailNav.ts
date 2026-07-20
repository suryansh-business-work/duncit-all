import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';

/** Shared navigation to the detail screens from any pod/club card. Uses the exact
 * slug grammar mWeb navigates with (/club/:clubSlug/pod/:podSlug and /club/:clubSlug)
 * so the web build's address bar is byte-for-byte identical to mWeb — never
 * /club/undefined/pod/undefined?podId=…. The detail screens resolve the slugs →
 * doc id via podBySlugs / clubBySlug. Slug-less (legacy) items are skipped, exactly
 * as mWeb guards its own navigate calls. */
export function useDetailNav() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return {
    openPod: (clubSlug?: string | null, podSlug?: string | null) => {
      if (clubSlug && podSlug) navigation.navigate('PodDetails', { clubSlug, podSlug });
    },
    openClub: (clubSlug?: string | null) => {
      if (clubSlug) navigation.navigate('ClubDetails', { clubSlug });
    },
    openPreviousPods: () => navigation.navigate('PreviousPods'),
    openHappeningNearby: () => navigation.navigate('HappeningNearby'),
  };
}
