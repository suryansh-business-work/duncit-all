import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';
import { findTour } from '@duncit/tours';
import { useTours } from './TourContext';

/** Anchors are declared as `data-tour="<anchor>"` on the element they describe. */
const selectorFor = (anchor: string) => `[data-tour="${anchor}"]`;

/**
 * Resolve a tour's steps against what is actually on screen.
 *
 * A step whose element is absent is dropped rather than shown: Joyride cannot
 * position a tooltip against a missing target, and a screen legitimately varies
 * (no clubs yet → no clubs section). Dropping keeps the rest of the walkthrough
 * usable instead of failing the whole thing.
 */
function resolveSteps(anchors: readonly { anchor: string; title: string; body: string }[]): Step[] {
  return anchors
    .filter((step) => globalThis.document.querySelector(selectorFor(step.anchor)))
    .map((step) => ({
      target: selectorFor(step.anchor),
      title: step.title,
      content: step.body,
      disableBeacon: true,
    }));
}

/**
 * Renders the active tour. Mounted once, app-wide, so a tour survives the
 * navigation that takes the user to the screen it runs on.
 */
export function TourRunner() {
  const theme = useTheme();
  const { activeTourId, finishTour } = useTours();
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!activeTourId) {
      setSteps([]);
      return undefined;
    }
    const tour = findTour(activeTourId);
    if (!tour) {
      finishTour(activeTourId);
      return undefined;
    }
    // The destination route is still mounting when a tour is started from the
    // Tour Guide centre, so resolve on the next tick rather than immediately.
    const timer = globalThis.setTimeout(() => {
      const resolved = resolveSteps(tour.steps);
      setSteps(resolved);
      // Nothing on this screen to point at — end rather than leave a dead tour
      // armed. Not marked complete: the user never saw it.
      if (resolved.length === 0) finishTour(tour.id);
    }, 350);
    return () => globalThis.clearTimeout(timer);
  }, [activeTourId, finishTour]);

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
        // Back / Skip / Next, matching the brief's Previous-Next-Skip-Finish set.
        buttons: ['back', 'skip', 'primary'],
        showProgress: true,
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
