import { Box, Tab, Tabs, Typography, type TabsProps } from '@mui/material';
import { mergeSx } from '@duncit/ui';
import { useTranslation } from './i18n';
import { tabIds } from './tabPanelProps';
import { TabSearchField } from './TabSearchField';
import type { DuncitTabsState, TabValue } from './types';
import { useTabSearch } from './useTabSearch';

export interface DuncitTabsProps<T extends TabValue>
  extends DuncitTabsState<T>,
    Omit<TabsProps, 'value' | 'onChange' | 'children'> {
  /**
   * Wires each tab to the panel it reveals: the tab gets an `id` and an
   * `aria-controls`, and the panel spreads `tabPanelProps(idPrefix, value)`.
   * Omit it for a strip that reveals no panel of its own (a filter bar).
   */
  idPrefix?: string;
  /**
   * The search box at the head of the strip. On by default, so every strip
   * filters the same way; pass `false` for one that would be worse for it —
   * a two-tab segmented control has nothing to search.
   */
  searchable?: boolean;
  /** Placeholder override, when "Search tabs" is not what this strip holds. */
  searchPlaceholder?: string;
}

/** What a strip without an `idPrefix` puts on its tabs — nothing. */
const NO_IDS = { tabId: undefined, panelId: undefined };

/** The search box sits at the start of the row; the strip takes what is left. */
const ROW_SX = { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 } as const;
const STRIP_SX = { flex: 1, minWidth: 0 } as const;
/**
 * The caption stays in the DOM with nothing in it, and hides itself while it is
 * empty. A live region a screen reader is to announce has to exist BEFORE the
 * text arrives; one mounted together with its message is announced by some
 * readers and missed by others.
 */
const NO_MATCH_SX = { flexShrink: 0, color: 'text.secondary', '&:empty': { display: 'none' } } as const;

/**
 * The tab strip every portal, mWeb and shared dialog renders.
 *
 * It is a thin wrapper over MUI's `<Tabs>` — every layout prop passes straight
 * through — with two things it will not let a caller get wrong:
 *
 *  - each `<Tab>` is given an explicit `value` from its item. MUI falls back to
 *    the child index when a tab has no value, and since the selection is written
 *    to the URL (`?selectedtab=`), that index is what a shared link would carry:
 *    opaque to a reader and pointing at a different tab as soon as one is
 *    inserted;
 *  - the strip carries its own debounced search, which filters the TABS
 *    client-side (see `filterTabItems`). The open tab is never filtered away,
 *    so the panel below always still has its tab.
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
  idPrefix,
  searchable = true,
  searchPlaceholder,
  sx,
  ...tabsProps
}: Readonly<DuncitTabsProps<T>>) {
  const { t } = useTranslation();
  const search = useTabSearch(items, value);
  const shown = searchable ? search.visible : items;
  const stripSx = searchable ? mergeSx(STRIP_SX, sx) : sx;
  const strip = (
    <Tabs
      {...tabsProps}
      sx={stripSx}
      value={value}
      onChange={(_event, next: T) => onChange(next)}
    >
      {shown.map((item) => {
        const ids = idPrefix === undefined ? NO_IDS : tabIds(idPrefix, item.value);
        return (
          <Tab
            key={item.key ?? item.value}
            value={item.value}
            label={item.label}
            icon={item.icon}
            iconPosition={item.iconPosition}
            disabled={item.disabled}
            sx={item.sx}
            id={ids.tabId}
            aria-controls={ids.panelId}
            data-testid={item.testId}
          />
        );
      })}
    </Tabs>
  );

  if (!searchable) return strip;

  const testId = idPrefix === undefined ? 'tabs-search' : `${idPrefix}-tabs-search`;
  const foundNothing = search.needle !== '' && search.matches === 0;
  const noMatchText = foundNothing ? t('tabs.search.noMatches', { vars: { needle: search.needle } }) : '';
  return (
    <Box sx={ROW_SX}>
      <TabSearchField
        value={search.input}
        onChange={search.setInput}
        placeholder={searchPlaceholder ?? t('tabs.search.placeholder')}
        clearLabel={t('tabs.search.clear')}
        testId={testId}
      />
      {strip}
      <Typography variant="caption" role="status" sx={NO_MATCH_SX} data-testid={`${testId}-empty`}>
        {noMatchText}
      </Typography>
    </Box>
  );
}
