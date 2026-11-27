import { isTabEntry } from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface TabEntryMock {
  /** The tab that was showing before the change. */
  from: number;
  /** The tab showing now — the same number means Back from a pushed screen. */
  to: number;
  /** The tab asking whether it was just entered. */
  tab: number;
}

const ROUTES = ['Home', 'Explore', 'Clubs', 'Venues'].map((name) => ({ key: `${name}-key`, name }));

export const screenScrollDemos: PackageDemo[] = [
  defineDemo<TabEntryMock>({
    id: 'screen-scroll',
    title: 'isTabEntry — a tab switched to opens at the top',
    note:
      'Set from 0 and to 2 with tab 2: the user switched to Clubs, so it scrolls to the top (as mWeb opens every bottom-nav page). Set to equal to from (Back from a pod page to the same tab): false, so the tab keeps its place. scrollToTop then calls scrollToOffset on a FlatList or scrollTo on a ScrollView.',
    mock: { from: 0, to: 2, tab: 2 },
    compute: ({ from, to, tab }) => ({
      tab: ROUTES[tab]?.name ?? 'none',
      scrollsToTop: isTabEntry(from, { index: to, routes: ROUTES }, ROUTES[tab]?.key ?? ''),
    }),
  }),
];
