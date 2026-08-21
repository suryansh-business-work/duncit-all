import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { reportJourneyStep, type JourneyStep } from '../lib/short-link-journey';

/**
 * Which funnel step a path represents. Kept as one ordered list rather than
 * scattered `reportJourneyStep` calls across page components: the funnel is a
 * single idea, and spreading it over five files is how a step quietly stops
 * being reported when a page is refactored. (LANDED is not here — the landing
 * capture reports it server-side through `/r/v` before React even mounts.)
 */
const PATH_STEPS: [RegExp, JourneyStep][] = [
  [/^\/club\/[^/]+\/pod\/[^/]+/, 'VIEWED_POD'],
  [/^\/checkout/, 'CHECKOUT_STARTED'],
  [/^\/product-checkout/, 'CHECKOUT_STARTED'],
  [/^\/signup-survey/, 'SIGNED_UP'],
];

export const stepForPath = (pathname: string): JourneyStep | null =>
  PATH_STEPS.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;

/**
 * Follow a short-link visitor through the funnel.
 *
 * Only ever reports when the visitor actually arrived through a link —
 * `reportJourneyStep` waits on the landing capture and drops the call when
 * there is no click behind it, so this costs nothing for the vast majority of
 * traffic. That wait is the point: the click id lands a round-trip after the
 * page does, so a step checked against storage here would miss the first one
 * every time. The server ignores a step it has already recorded, so revisiting
 * a page does not move a timestamp.
 */
export function useShortLinkJourney(isAuthed: boolean) {
  const location = useLocation();
  const reported = useRef(new Set<JourneyStep>());

  const send = (step: JourneyStep) => {
    // StrictMode double-invokes effects in development; the local guard keeps
    // that from firing two identical mutations per navigation.
    if (reported.current.has(step)) return;
    reported.current.add(step);
    reportJourneyStep(step);
  };

  useEffect(() => {
    const step = stepForPath(location.pathname);
    if (step) send(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    // Signing in is what binds this click to an account — until it happens the
    // whole trail is anonymous and cannot be joined to a payment.
    if (isAuthed) send('SIGNED_UP');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);
}
