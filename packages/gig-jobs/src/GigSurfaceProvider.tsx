import { createContext, useContext, type ReactNode } from 'react';
import type { LevelFns } from '@duncit/logs';

/**
 * What differs between the surfaces that mount Gig Jobs — only where links
 * go. mWeb routes everything in-app; the Partners console routes the board
 * in-portal but opens the freelancer profile on mWeb, where Earn with Duncit's
 * freelancer step lives.
 */
export interface GigSurfaceConfig {
  /** Navigate to an in-surface path (`/gigs/…`). */
  go: (path: string) => void;
  /** Open the freelancer profile (join, or edit an existing one). */
  openFreelancerProfile: () => void;
  /** The surface's logger — a failed background refresh is filed against the screen that started it. */
  logger: LevelFns;
}

const GigSurfaceContext = createContext<GigSurfaceConfig | null>(null);

export function GigSurfaceProvider({ value, children }: Readonly<{ value: GigSurfaceConfig; children: ReactNode }>) {
  return <GigSurfaceContext.Provider value={value}>{children}</GigSurfaceContext.Provider>;
}

/** Throws outside the provider on purpose — a gig screen with nowhere to link is a wiring bug. */
export function useGigSurface(): GigSurfaceConfig {
  const value = useContext(GigSurfaceContext);
  if (!value) throw new Error('useGigSurface must be used inside <GigSurfaceProvider>');
  return value;
}
