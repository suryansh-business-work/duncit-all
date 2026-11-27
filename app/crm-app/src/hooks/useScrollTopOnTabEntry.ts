import { useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { isTabEntry, scrollToTop, type ScrollableToTop } from '@duncit/utils';

/**
 * A ref for a tab screen's root `ScrollView` / `FlatList` that puts it back at
 * the top each time the user switches TO the tab. Tabs stay mounted behind one
 * another, so a tab used to open wherever it was last scrolled; every page of
 * the CRM portal opens at the top, so the app's tabs do too. Coming Back to a
 * tab from a pushed screen does not move the tab navigator, so the tab keeps
 * its place — and its filters always stay.
 */
export function useScrollTopOnTabEntry<T extends ScrollableToTop>() {
  const ref = useRef<T>(null);
  const navigation = useNavigation();
  const { key } = useRoute();
  useEffect(() => {
    let previousIndex: number | undefined = navigation.getState()?.index;
    return navigation.addListener('state', (event) => {
      const { state } = event.data;
      if (isTabEntry(previousIndex, state, key)) scrollToTop(ref.current);
      previousIndex = state.index;
    });
  }, [navigation, key]);
  return ref;
}
