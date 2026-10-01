import { createContext, useContext, type ReactNode } from 'react';

/**
 * Whether a strip that says nothing about `searchable` gets the search box.
 *
 * On unless a surface turns it off: the portals run long strips on wide
 * screens, where narrowing them is worth a field in the header. mWeb's strips
 * are two to four tabs across a phone, so the box only takes the room the tabs
 * need — and the native app, which mWeb must match, never had one.
 */
const TabSearchDefaultContext = createContext(true);

export interface TabSearchDefaultProviderProps {
  /** What every strip below falls back to when it passes no `searchable`. */
  searchable: boolean;
  children: ReactNode;
}

/**
 * Sets the search default for a whole surface, once, at its root.
 *
 * This is a context rather than a prop on each strip because some strips are
 * not the surface's to edit: `@duncit/media-picker`'s dialog renders the same
 * `<DuncitTabs>` under a portal and under mWeb, and only the tree it is mounted
 * in knows which. A strip's own `searchable` prop still wins over this.
 */
export function TabSearchDefaultProvider({
  searchable,
  children,
}: Readonly<TabSearchDefaultProviderProps>) {
  return <TabSearchDefaultContext.Provider value={searchable}>{children}</TabSearchDefaultContext.Provider>;
}

/** The surface's default, for `<DuncitTabs>` to fall back to. */
export function useTabSearchDefault(): boolean {
  return useContext(TabSearchDefaultContext);
}
