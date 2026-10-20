/** The Sections console's tabs, in the order the strip shows them — each is its own URL. */
export type SectionsTab = 'home' | 'deals' | 'header-footer';

export const SECTIONS_TAB_KEYS: Record<SectionsTab, string> = {
  home: 'ecommPortal.sections.tabHome',
  deals: 'ecommPortal.sections.tabDeals',
  'header-footer': 'ecommPortal.sections.tabHeaderFooter',
};

export const SECTIONS_TABS = Object.keys(SECTIONS_TAB_KEYS) as SectionsTab[];

export const sectionsTabPath = (tab: SectionsTab): string => `/sections/${tab}`;

export const isSectionsTab = (value: string | undefined): value is SectionsTab =>
  value !== undefined && (SECTIONS_TABS as readonly string[]).includes(value);
