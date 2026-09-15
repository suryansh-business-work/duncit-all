import type { TabValue } from './types';

/** The id a tab and the panel it controls are known by, for one strip. */
export function tabIds(idPrefix: string, value: TabValue) {
  return { tabId: `${idPrefix}-tab-${value}`, panelId: `${idPrefix}-panel-${value}` };
}

/**
 * Spread onto the region a tab reveals, so the tablist, the tab and the panel
 * form one widget for assistive technology (WCAG 1.3.1 / 4.1.2).
 *
 * Pass the SAME `idPrefix` given to `<DuncitTabs idPrefix>`: the tab's
 * `aria-controls` then points at this panel, and the panel is named by its tab.
 *
 *     <DuncitTabs {...tabs} idPrefix="pods" />
 *     <Box {...tabPanelProps('pods', tabs.value)}>…</Box>
 */
export function tabPanelProps(idPrefix: string, value: TabValue) {
  const { tabId, panelId } = tabIds(idPrefix, value);
  return { role: 'tabpanel', id: panelId, 'aria-labelledby': tabId } as const;
}
