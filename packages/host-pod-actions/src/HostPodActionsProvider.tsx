import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SlotLabels } from '@duncit/slots';
import type { PodMediaLabels } from '@duncit/utils';
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
  /** Origin the pod's per-pod links (rating form, media page) are built against. */
  linkBaseUrl: string;
  /** Opens the rating form for a pod. */
  onOpenFeedback: (podId: string) => void;
  /**
   * Opens the pod's Upload Pod Media page — a PAGE, so the surface owns the
   * navigation and a console without that route omits the menu item entirely.
   */
  onOpenPodMedia?: (podId: string) => void;
  /**
   * Turns one of those links into its tracked short link before the host sends
   * it. Optional: a surface without a client for it hands out the plain link,
   * which still works — it is simply not counted.
   */
  resolveShareUrl?: (
    kind: 'POD_FEEDBACK' | 'POD_MEDIA',
    podId: string,
    plainUrl: string,
  ) => Promise<string>;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  /** Slot-picker copy for the resubmit dialog — `buildSlotLabels(t, <ns>.slots)`. */
  slotLabels: SlotLabels;
  /** Pod-media copy — `buildPodMediaLabels(t, 'mweb' | 'shell')`, shared with native. */
  podMediaLabels: PodMediaLabels;
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
    linkBaseUrl,
    onOpenFeedback,
    onOpenPodMedia,
    resolveShareUrl,
    notifySuccess,
    notifyError,
    slotLabels,
    podMediaLabels,
  } = config;
  const value = useMemo(
    () => ({
      labels,
      renderMediaField,
      onViewProfile,
      linkBaseUrl,
      onOpenFeedback,
      onOpenPodMedia,
      resolveShareUrl,
      notifySuccess,
      notifyError,
      slotLabels,
      podMediaLabels,
    }),
    [
      labels,
      renderMediaField,
      onViewProfile,
      linkBaseUrl,
      onOpenFeedback,
      onOpenPodMedia,
      resolveShareUrl,
      notifySuccess,
      notifyError,
      slotLabels,
      podMediaLabels,
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
