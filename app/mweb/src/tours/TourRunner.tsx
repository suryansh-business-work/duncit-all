import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';
import { findTour, type TourStep } from '@duncit/tours';
import { useLocation } from 'react-router-dom';
import { useTours } from './TourContext';

/** Anchors are declared as `data-tour="<anchor>"` on the element they describe. */
const selectorFor = (anchor: string) => `[data-tour="${anchor}"]`;

/** How long to keep looking for a tour's anchors, and how often. */
const POLL_MS = 250;
const POLL_LIMIT = 40; // 10s — long enough for a slow feed, short enough to give up

/**
 * Resolve a tour's steps against what is actually on screen.
 *
 * A step whose element is absent is dropped: Joyride cannot position a tooltip
 * against a missing target, and a screen legitimately varies (no clubs yet → no
 * clubs section). Dropping keeps the rest of the walkthrough usable.
 */
function resolveSteps(steps: readonly TourStep[]): Step[] {
  return steps
    .filter((step) => globalThis.document.querySelector(selectorFor(step.anchor)))
    .map((step) => ({
      target: selectorFor(step.anchor),
      title: step.title,
      content: step.body,
    }));
}

/**
 * Renders the active tour. Mounted once, app-wide, so a tour survives the
 * navigation that takes the user to the screen it runs on.
 */
export function TourRunner() {
  const theme = useTheme();
  const location = useLocation();
  const { activeTourId, finishTour } = useTours();
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    setSteps([]);
    if (!activeTourId) return undefined;
    const tour = findTour(activeTourId);
    if (!tour) {
      finishTour(activeTourId);
      return undefined;
    }
    // Anchors appear when the destination route mounts AND its data lands, which
    // is not one predictable moment — a fixed delay either fires before the feed
    // renders or waits longer than it needs to. Poll until they show up, then
    // stop. This is also what lets a tour armed on a list fire on the detail
    // screen the user opens next.
    let tries = 0;
    const timer = globalThis.setInterval(() => {
      tries += 1;
      const resolved = resolveSteps(tour.steps);
      if (resolved.length > 0) {
        setSteps(resolved);
        globalThis.clearInterval(timer);
      } else if (tries >= POLL_LIMIT) {
        globalThis.clearInterval(timer);
      }
    }, POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [activeTourId, finishTour, location.pathname]);

  if (!activeTourId || steps.length === 0) return null;

  const handleEvent = ({ status }: EventData) => {
    // Finished or skipped — both count as shown.
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) finishTour(activeTourId);
  };

  return (
    <Joyride
      steps={steps}
      run
      continuous
      scrollToFirstStep
      options={{
        // v3 renamed disableBeacon → skipBeacon. Without it the tour opens as a
        // pulsing dot the user has to find and click, which reads as "nothing
        // happened" — go straight to the first tooltip.
        skipBeacon: true,
        // Back / Skip / Next, matching the brief's Previous-Next-Skip-Finish set.
        buttons: ['back', 'skip', 'primary'],
        showProgress: true,
        // Above the app bar and the bottom nav, or the tooltip renders under them.
        zIndex: theme.zIndex.modal + 1,
        primaryColor: theme.palette.primary.main,
        textColor: theme.palette.text.primary,
        backgroundColor: theme.palette.background.paper,
        arrowColor: theme.palette.background.paper,
      }}
      onEvent={handleEvent}
      locale={{ back: 'Previous', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip' }}
    />
  );
}
