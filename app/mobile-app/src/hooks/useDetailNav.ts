import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';

/** Shared navigation to the detail screens from any pod/club card. */
export function useDetailNav() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return {
    openPod: (podId: string, title: string) => navigation.navigate('PodDetails', { podId, title }),
    openClub: (clubId: string, title: string) =>
      navigation.navigate('ClubDetails', { clubId, title }),
    openPreviousPods: () => navigation.navigate('PreviousPods'),
  };
}
