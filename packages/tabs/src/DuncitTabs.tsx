import { Tab, Tabs, type TabsProps } from '@mui/material';
import type { DuncitTabsState, TabValue } from './types';

export interface DuncitTabsProps<T extends TabValue>
  extends DuncitTabsState<T>,
    Omit<TabsProps, 'value' | 'onChange' | 'children'> {}

/**
 * The tab strip every portal, mWeb and shared dialog renders.
 *
 * It is a thin wrapper over MUI's `<Tabs>` — every layout prop passes straight
 * through — with one thing it will not let a caller get wrong: each `<Tab>` is
 * given an explicit `value` from its item. MUI falls back to the child index
 * when a tab has no value, and since the selection is written to the URL
 * (`?selectedtab=`), that index is what a shared link would carry: opaque to a
 * reader and pointing at a different tab as soon as one is inserted.
 *
 * Pair it with `useTabParam` for a strip that owns its selection:
 *
 *     const tabs = useTabParam({ items: POD_TABS, fallback: 'upcoming' });
 *     <DuncitTabs {...tabs} variant="scrollable" />
 *
 * or pass `items`/`value`/`onChange` by hand when the parent owns it.
 */
export function DuncitTabs<T extends TabValue>({
  items,
  value,
  onChange,
  ...tabsProps
}: Readonly<DuncitTabsProps<T>>) {
  return (
    <Tabs {...tabsProps} value={value} onChange={(_event, next: T) => onChange(next)}>
      {items.map((item) => (
        <Tab
          key={item.key ?? item.value}
          value={item.value}
          label={item.label}
          icon={item.icon}
          iconPosition={item.iconPosition}
          disabled={item.disabled}
          sx={item.sx}
          data-testid={item.testId}
        />
      ))}
    </Tabs>
  );
}
