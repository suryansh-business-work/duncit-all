import { useCallback, useState } from 'react';
import { isTourCompleted, markTourCompleted, readCompletedTours, serializeCompletedTours, tourStorageKey } from '@duncit/tours';
import { readGuideFlag, writeGuideFlag } from './guideStorage';

export interface FirstRunTour {
  /** True until this user has finished or skipped the tour once. */
  open: boolean;
  /** Opens it again — what PageIntro's "Start tour" button calls. */
  start: () => void;
  /** Hand it to PortalTour's `onClose`. Finished or skipped, the tour counts as shown. */
  close: (completed: boolean) => void;
}

/** The bucket for a viewer with no user id yet. */
const ANONYMOUS = 'anonymous';

/**
 * Opens a page's tour the first time this user sees the page, and never again
 * on its own. The record is the same per-user list mWeb keeps for its tours
 * (`@duncit/tours`), so a portal's own tour id shares one shape and one key
 * scheme with the member app's. Storage is read once, on mount.
 */
export function useFirstRunTour(tourId: string, userId?: string | null): FirstRunTour {
  const key = tourStorageKey(userId ?? ANONYMOUS);
  const [open, setOpen] = useState(() => !isTourCompleted(readCompletedTours(readGuideFlag(key)), tourId));

  const start = useCallback(() => setOpen(true), []);

  // Skipping counts as shown, or the tour would nag on every visit until it was
  // sat through — so `completed` is not consulted here.
  const close = useCallback(() => {
    const completed = markTourCompleted(readCompletedTours(readGuideFlag(key)), tourId);
    writeGuideFlag(key, serializeCompletedTours(completed));
    setOpen(false);
  }, [key, tourId]);

  return { open, start, close };
}
