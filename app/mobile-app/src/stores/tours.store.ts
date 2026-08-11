import { create } from 'zustand';
import { getItem, setItem } from '@/services/secure-storage';
import {
  HOME_TOUR_ID,
  markTourCompleted,
  readCompletedTours,
  serializeCompletedTours,
  shouldAutoStartHomeTour,
  tourStorageKey,
  type TourId,
  type TourStep,
} from '@duncit/tours';

interface TourState {
  completed: TourId[];
  activeTourId: TourId | null;
  /**
   * The running tour's step list, frozen when it starts.
   *
   * rn-tourguide identifies a highlight by its ZONE NUMBER, so the provider and
   * every anchor have to agree on the numbering. Deriving it live from
   * `mountedAnchors` meant a section arriving mid-walkthrough renumbered every
   * step behind it and the spotlight jumped to the wrong element. Freezing the
   * list once is what keeps a step pointing at the thing its copy describes.
   */
  activeSteps: TourStep[];
  /**
   * Anchors currently mounted on screen. Feeds the resolve pass above; a step
   * whose element is absent has nothing to spotlight and is dropped.
   */
  mountedAnchors: string[];
  registerAnchor: (anchor: string) => void;
  unregisterAnchor: (anchor: string) => void;
  /** Load this user's completions. Called once the signed-in user is known. */
  hydrate: (userId: string) => Promise<void>;
  startTour: (id: TourId) => void;
  /** Lock the resolved step list in; the overlay starts on the first of these. */
  armTour: (steps: readonly TourStep[]) => void;
  /** Finished or skipped — either way it counts as shown. */
  finishTour: (userId: string, id: TourId) => Promise<void>;
  maybeAutoStartHomeTour: (isFirstSignup: boolean) => void;
}

/**
 * Guided-tour state, twin of mWeb's TourContext. The registry, the copy and the
 * "shown once" rule all come from @duncit/tours, so the two surfaces cannot
 * drift on which tours exist or when they run — only on how the overlay looks,
 * which is unavoidable with two different tour libraries.
 */
export const useToursStore = create<TourState>((set, get) => ({
  completed: [],
  activeTourId: null,
  activeSteps: [],
  mountedAnchors: [],

  registerAnchor: (anchor) =>
    set((s) =>
      s.mountedAnchors.includes(anchor) ? s : { mountedAnchors: [...s.mountedAnchors, anchor] },
    ),

  unregisterAnchor: (anchor) =>
    set((s) => ({ mountedAnchors: s.mountedAnchors.filter((a) => a !== anchor) })),

  hydrate: async (userId) => {
    try {
      const raw = await getItem(tourStorageKey(userId));
      set({ completed: readCompletedTours(raw) });
    } catch {
      // Unreadable storage must not cost the user their tour.
      set({ completed: [] });
    }
  },

  startTour: (id) => set({ activeTourId: id, activeSteps: [] }),

  armTour: (steps) => set({ activeSteps: [...steps] }),

  finishTour: async (userId, id) => {
    const next = markTourCompleted(get().completed, id);
    set({ completed: next, activeTourId: null, activeSteps: [] });
    try {
      await setItem(tourStorageKey(userId), serializeCompletedTours(next));
    } catch {
      // A full or blocked store must not break the tour that just ran.
    }
  },

  maybeAutoStartHomeTour: (isFirstSignup) => {
    if (shouldAutoStartHomeTour(get().completed, isFirstSignup)) {
      set({ activeTourId: HOME_TOUR_ID, activeSteps: [] });
    }
  },
}));
