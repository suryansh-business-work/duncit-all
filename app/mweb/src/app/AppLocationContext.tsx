import { createContext, useContext, useMemo, type ReactNode } from 'react';

/** The header's active selection — the city (a Location row id) and the area in it. */
export interface AppLocation {
  locationId: string;
  zoneName: string;
}

const AppLocationContext = createContext<AppLocation>({ locationId: '', zoneName: '' });

/**
 * Publishes the header's selected location to every routed page.
 *
 * The selection is state on <App>, handed to the header as props; a page that
 * needs to compare itself against it (a pod link into another city) reads it
 * from here rather than threading two more props through the route table. It
 * is read-only on purpose: the header still owns the change and its persist,
 * so a page asks for a switch through APPLY_LOCATION_EVENT.
 */
export function AppLocationProvider({
  locationId,
  zoneName,
  children,
}: Readonly<AppLocation & { children: ReactNode }>) {
  const value = useMemo(() => ({ locationId, zoneName }), [locationId, zoneName]);
  return <AppLocationContext.Provider value={value}>{children}</AppLocationContext.Provider>;
}

export function useAppLocation(): AppLocation {
  return useContext(AppLocationContext);
}
