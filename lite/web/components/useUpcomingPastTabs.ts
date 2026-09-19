import { useMemo } from 'react';
import { useTabParam, type DuncitTabItem, type DuncitTabsState } from '@duncit/tabs';
import { useWebT } from '../../shared/i18n';

export type ListPeriod = 'upcoming' | 'past';

/** The Upcoming / Past strip every personal list shares, with its selection in the URL. */
export function useUpcomingPastTabs(): DuncitTabsState<ListPeriod> & { past: boolean } {
  const { t } = useWebT();
  const items = useMemo<DuncitTabItem<ListPeriod>[]>(
    () => [
      { value: 'upcoming', label: t('liteWeb.events.upcoming'), testId: 'tab-upcoming' },
      { value: 'past', label: t('liteWeb.events.past'), testId: 'tab-past' },
    ],
    [t],
  );
  const tabs = useTabParam<ListPeriod>({ items, fallback: 'upcoming' });
  return { ...tabs, past: tabs.value === 'past' };
}
