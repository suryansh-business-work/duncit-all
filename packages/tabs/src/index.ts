/**
 * @duncit/tabs — the MUI tab strip, with its selection in the URL.
 *
 * One `<DuncitTabs>` and one `useTabParam` for every strip in mWeb and the
 * seventeen portals, so no surface hand-rolls a `useState` that a reload throws
 * away, and no strip ships a `<Tab>` without an explicit value. The strip's
 * debounced tab search lives here too, for the same reason: one filter, not one
 * per page that grew too many tabs.
 */
export { DuncitTabs } from './DuncitTabs';
export type { DuncitTabsProps } from './DuncitTabs';
export { tabIds, tabPanelProps } from './tabPanelProps';
export { TAB_PARAM, useTabParam } from './useTabParam';
export type { UseTabParamOptions } from './useTabParam';
export { filterTabItems, tabSearchText } from './tabSearch';
export type { FilteredTabs } from './tabSearch';
export { TAB_SEARCH_DEBOUNCE_MS, useTabSearch } from './useTabSearch';
export type { TabSearchState } from './useTabSearch';
export type { DuncitTabItem, DuncitTabsState, TabValue } from './types';
