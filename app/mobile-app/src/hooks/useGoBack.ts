import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';

/**
 * Back navigation that always works — on the web build a deep-linked URL has
 * no in-app history, so `goBack()` is a silent no-op. Fall back to the Home
 * tab so the back arrow never feels dead.
 */
export function useGoBack() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home', { screen: 'HomeTab' });
  }, [navigation]);
}
