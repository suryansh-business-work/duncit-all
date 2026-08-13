/**
 * @duncit/tabs — the MUI tab strip, with its selection in the URL.
 *
 * One `<DuncitTabs>` and one `useTabParam` for every strip in mWeb and the
 * seventeen portals, so no surface hand-rolls a `useState` that a reload throws
 * away, and no strip ships a `<Tab>` without an explicit value.
 */
export { DuncitTabs } from './DuncitTabs';
export type { DuncitTabsProps } from './DuncitTabs';
export { TAB_PARAM, useTabParam } from './useTabParam';
export type { UseTabParamOptions } from './useTabParam';
export type { DuncitTabItem, DuncitTabsState, TabValue } from './types';
