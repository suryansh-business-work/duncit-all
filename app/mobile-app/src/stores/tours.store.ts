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
} from '@duncit/tours';

interface TourState {
  completed: TourId[];
  activeTourId: TourId | null;
  /** Load this user's completions. Called once the signed-in user is known. */
  hydrate: (userId: string) => Promise<void>;
  startTour: (id: TourId) => void;
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

  hydrate: async (userId) => {
    try {
      const raw = await getItem(tourStorageKey(userId));
      set({ completed: readCompletedTours(raw) });
    } catch {
      // Unreadable storage must not cost the user their tour.
      set({ completed: [] });
    }
  },

  startTour: (id) => set({ activeTourId: id }),

  finishTour: async (userId, id) => {
    const next = markTourCompleted(get().completed, id);
    set({ completed: next, activeTourId: null });
    try {
      await setItem(tourStorageKey(userId), serializeCompletedTours(next));
    } catch {
      // A full or blocked store must not break the tour that just ran.
    }
  },

  maybeAutoStartHomeTour: (isFirstSignup) => {
    if (shouldAutoStartHomeTour(get().completed, isFirstSignup)) {
      set({ activeTourId: HOME_TOUR_ID });
    }
  },
}));
