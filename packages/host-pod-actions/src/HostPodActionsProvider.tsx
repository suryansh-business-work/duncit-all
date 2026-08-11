import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SlotLabels } from '@duncit/slots';
import type { HostPodActionLabels } from './labels';
import type { RenderMediaField } from './types';

/**
 * Everything these dialogs cannot decide for themselves.
 *
 * The five dialogs nest — completing a pod opens the scanner, which opens an
 * attendee card — so threading the per-surface pieces through props would mean
 * every call site restating them at three levels. They are supplied once, where
 * the surface mounts its host area.
 */
export interface HostPodActionsConfig {
  labels: HostPodActionLabels;
  /** The surface's own media picker field (mWeb's Pexels one, a portal's ImageKit one). */
  renderMediaField: RenderMediaField;
  /** Opens a scanned attendee's public profile — an in-app route on mWeb, a new tab in a portal. */
  onViewProfile: (profilePath: string) => void;
  /** Origin the pod's rating link is built against. */
  feedbackBaseUrl: string;
  /** Opens the rating form for a pod. */
  onOpenFeedback: (podId: string) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  /** Slot-picker copy for the resubmit dialog — `buildSlotLabels(t, <ns>.slots)`. */
  slotLabels: SlotLabels;
}

const HostPodActionsContext = createContext<HostPodActionsConfig | null>(null);

interface ProviderProps extends HostPodActionsConfig {
  children: ReactNode;
}

/** Supplies the per-surface pieces every host pod dialog needs. */
export function HostPodActionsProvider({ children, ...config }: Readonly<ProviderProps>) {
  const {
    labels,
    renderMediaField,
    onViewProfile,
    feedbackBaseUrl,
    onOpenFeedback,
    notifySuccess,
    notifyError,
    slotLabels,
  } = config;
  const value = useMemo(
    () => ({
      labels,
      renderMediaField,
      onViewProfile,
      feedbackBaseUrl,
      onOpenFeedback,
      notifySuccess,
      notifyError,
      slotLabels,
    }),
    [
      labels,
      renderMediaField,
      onViewProfile,
      feedbackBaseUrl,
      onOpenFeedback,
      notifySuccess,
      notifyError,
      slotLabels,
    ],
  );
  return (
    <HostPodActionsContext.Provider value={value}>{children}</HostPodActionsContext.Provider>
  );
}

/**
 * Reads the host-pod-action config.
 *
 * Throwing rather than falling back to defaults is deliberate: a dialog
 * rendered outside the provider would otherwise silently lose its media picker
 * and show untranslated keys, which reads as a broken feature rather than a
 * missing mount.
 */
export function useHostPodActionsConfig(): HostPodActionsConfig {
  const config = useContext(HostPodActionsContext);
  if (!config) {
    throw new Error('Host pod dialogs must be rendered inside <HostPodActionsProvider>.');
  }
  return config;
}
