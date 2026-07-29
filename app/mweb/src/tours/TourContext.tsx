import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  HOME_TOUR_ID,
  markTourCompleted,
  readCompletedTours,
  serializeCompletedTours,
  shouldAutoStartHomeTour,
  tourStorageKey,
  type TourId,
} from '@duncit/tours';

interface TourContextValue {
  /** Tours this user has finished or skipped. */
  completed: TourId[];
  /** The tour currently running, if any. */
  activeTourId: TourId | null;
  /** Arm a tour. The runtime starts it when its screen is mounted. */
  startTour: (id: TourId) => void;
  /** Finished or skipped — either way it counts as shown. */
  finishTour: (id: TourId) => void;
  /** Start the Home tour if this is a first signup that has never seen it. */
  maybeAutoStartHomeTour: (isFirstSignup: boolean) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/** Reads the persisted completions for a user. Storage is injected rather than
 * imported so tests (and a private-mode browser that throws on access) can pass
 * a stub instead of the real localStorage. */
function loadCompleted(storage: Pick<Storage, 'getItem'>, userId: string): TourId[] {
  try {
    return readCompletedTours(storage.getItem(tourStorageKey(userId)));
  } catch {
    return [];
  }
}

const TOUR_VIEWER = gql`
  query TourViewer {
    me {
      user_id
    }
  }
`;

interface ProviderProps {
  children: ReactNode;
  /** Overrides the signed-in user. Tests pass this instead of mocking Apollo. */
  userId?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

/**
 * Resolves the viewer itself rather than taking an id prop, so `App` does not
 * have to thread one through three provider layers. Signed-out visitors get the
 * `anon` bucket — they cannot reach the Tour Guide centre (it is behind auth),
 * and nothing is written for them.
 */
export function TourProvider({ children, userId: userIdProp, storage }: Readonly<ProviderProps>) {
  const { data } = useQuery(TOUR_VIEWER, { fetchPolicy: 'cache-first' });
  const userId = userIdProp ?? data?.me?.user_id ?? 'anon';
  const store = storage ?? globalThis.localStorage;
  const [completed, setCompleted] = useState<TourId[]>(() => loadCompleted(store, userId));
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);

  useEffect(() => {
    setCompleted(loadCompleted(store, userId));
  }, [store, userId]);

  const startTour = useCallback((id: TourId) => setActiveTourId(id), []);

  const finishTour = useCallback(
    (id: TourId) => {
      setActiveTourId(null);
      setCompleted((prev) => {
        const next = markTourCompleted(prev, id);
        try {
          store.setItem(tourStorageKey(userId), serializeCompletedTours(next));
        } catch {
          // A full or blocked storage must not break the tour that just ran.
        }
        return next;
      });
    },
    [store, userId],
  );

  const maybeAutoStartHomeTour = useCallback(
    (isFirstSignup: boolean) => {
      if (shouldAutoStartHomeTour(completed, isFirstSignup)) setActiveTourId(HOME_TOUR_ID);
    },
    [completed],
  );

  const value = useMemo(
    () => ({ completed, activeTourId, startTour, finishTour, maybeAutoStartHomeTour }),
    [completed, activeTourId, startTour, finishTour, maybeAutoStartHomeTour],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/** Tour state. Throws outside the provider — a silent no-op would make a tour
 * that never starts look like a content bug. */
export function useTours(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTours must be used inside a TourProvider');
  return ctx;
}
