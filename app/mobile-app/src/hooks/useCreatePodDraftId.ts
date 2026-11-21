import { useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isPodDraftId, newPodDraftId } from '@duncit/utils';

import type { RootStackParamList } from '@/navigation/types';

/**
 * The one draft this Create Pod visit writes to. Resuming a draft brings its
 * id; a new pod gets one minted on the device the moment the screen opens, and
 * it is written into the route params at once — the twin of mWeb putting it in
 * the URL — so the navigation state names the draft before anything is saved.
 */
export function useCreatePodDraftId(): string {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'CreatePod'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreatePod'>>();
  const fromRoute = route.params?.draftId;
  const [draftId] = useState(() =>
    isPodDraftId(fromRoute) ? fromRoute : newPodDraftId(randomUUID),
  );

  useEffect(() => {
    if (fromRoute !== draftId) navigation.setParams({ draftId });
  }, [navigation, fromRoute, draftId]);

  return draftId;
}
