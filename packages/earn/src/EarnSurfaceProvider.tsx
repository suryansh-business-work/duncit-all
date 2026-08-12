import { createContext, useContext, type ReactNode } from 'react';
import type { EarnJourney, EarnJourneyCta } from '@duncit/onboarding';
import type { SlotLabels } from '@duncit/slots';

/**
 * The bits that differ between the surfaces rendering the Earn feature (mWeb's
 * /earn page and the Partners portal's sidebar entry): where an unlocked card
 * sends the user, where an approved-role CTA goes, and which i18n namespace the
 * reschedule dialog's slot picker reads its copy from.
 */
export interface EarnSurfaceConfig {
  /** Unlocked card click — the application flow (mWeb: in-app survey route; portal: the mWeb URL). */
  openJourney: (journey: EarnJourney) => void;
  /** Approved-role next step (mWeb: host route in-app, partner paths external; portal: the inverse). */
  runCta: (cta: EarnJourneyCta) => void;
  /** Slot-picker copy for the reschedule dialog, built from the surface's namespace. */
  meetingSlotLabels: (rescheduling: boolean) => SlotLabels;
  /** Badge shown on the currently-booked slot in the reschedule picker. */
  currentSlotBadge: string;
}

const EarnSurfaceContext = createContext<EarnSurfaceConfig | null>(null);

export function EarnSurfaceProvider({
  config,
  children,
}: Readonly<{ config: EarnSurfaceConfig; children: ReactNode }>) {
  return <EarnSurfaceContext.Provider value={config}>{children}</EarnSurfaceContext.Provider>;
}

/** Throws when unmounted on purpose: a surface forgetting its provider should
 * fail loudly in dev, not render cards whose clicks silently do nothing. */
export function useEarnSurface(): EarnSurfaceConfig {
  const config = useContext(EarnSurfaceContext);
  if (!config) throw new Error('useEarnSurface must be used inside an EarnSurfaceProvider');
  return config;
}
