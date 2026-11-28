import { useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { isTabEntry } from '@duncit/utils';

import { useScreenScroll } from './ScreenScrollProvider';

/**
 * Tabs stay mounted behind one another, so without this a tab opened from the
 * bottom bar showed wherever it was last scrolled. mWeb opens every tab page
 * at the top, so the app does too: switching TO this tab scrolls it up before
 * it shows. Coming Back to a tab from a pushed screen does not move the tab
 * navigator, so that keeps its place (mWeb's Back restores it too).
 *
 * Rendered by `tabScreenLayout`, which React Navigation mounts inside the
 * tab's own navigation context.
 */
export function ScrollTopOnTabEntry() {
  const screenScroll = useScreenScroll();
  const navigation = useNavigation();
  const { key } = useRoute();
  useEffect(() => {
    let previousIndex: number | undefined = navigation.getState()?.index;
    return navigation.addListener('state', (event) => {
      const { state } = event.data;
      if (isTabEntry(previousIndex, state, key)) screenScroll?.scrollToTop();
      previousIndex = state.index;
    });
  }, [navigation, key, screenScroll]);
  return null;
}
