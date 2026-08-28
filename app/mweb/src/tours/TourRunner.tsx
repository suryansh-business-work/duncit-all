import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';
import { findTour, type TourStep } from '@duncit/tours';
import { useLocation } from 'react-router-dom';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useTours } from './TourContext';
import type { Translate } from '../i18n/fallback';
import { useTranslation } from '../i18n/useTranslation';

/** Anchors are declared as `data-tour="<anchor>"` on the element they describe. */
const selectorFor = (anchor: string) => `[data-tour="${anchor}"]`;

/**
 * How often to look for a tour's anchors.
 *
 * There is no give-up: several tours describe a screen that needs an id in its
 * URL — a club, a pod, a booking — so they land on the list that leads there and
 * WAIT. A ten-second limit meant they expired long before the user had chosen
 * anything, and the tour they started then did nothing at all, for good. The
 * poll is three selector lookups and it stops the moment the tour ends or the
 * runner unmounts.
 */
const POLL_MS = 250;

/**
 * How many quiet ticks mean "this is the whole screen".
 *
 * A page does not arrive at once: the header is up immediately, the feed lands
 * when its query resolves, and a rail below it later still. Starting at the
 * first anchor found meant starting with only the header — the Home tour has
 * seven steps and ran two, beginning at "Notifications", which reads as the
 * tour being broken rather than as five steps having been silently dropped.
 *
 * Three quiet ticks is under a second: long enough for the next section to
 * arrive, short enough that a screen which genuinely has no clubs yet does not
 * sit there waiting for one.
 */
const SETTLE_TICKS = 3;

/**
 * Resolve a tour's steps against what is actually on screen.
 *
 * A step whose element is absent is dropped: Joyride cannot position a tooltip
 * against a missing target, and a screen legitimately varies (no clubs yet → no
 * clubs section). Dropping keeps the rest of the walkthrough usable.
 */
function resolveSteps(steps: readonly TourStep[], t: Translate): Step[] {
  return steps
    .filter((step) => globalThis.document.querySelector(selectorFor(step.anchor)))
    .map((step) => ({
      target: selectorFor(step.anchor),
      title: t(step.titleKey),
      content: t(step.bodyKey),
    }));
}

/**
 * Renders the active tour. Mounted once, app-wide, so a tour survives the
 * navigation that takes the user to the screen it runs on.
 */
export function TourRunner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const { activeTourId, finishTour } = useTours();
  const [steps, setSteps] = useState<Step[]>([]);
  // The kill switch: with `tour_guide` off no overlay can open, whatever armed
  // it — the Tour Guide row is hidden, but the route stays reachable by URL.
  const enabled = useFeatureFlag('tour_guide');

  useEffect(() => {
    setSteps([]);
    if (!activeTourId) return undefined;
    const tour = findTour(activeTourId);
    if (!tour) {
      finishTour(activeTourId);
      return undefined;
    }
    /*
      Anchors appear when the destination route mounts AND its data lands, which
      is not one predictable moment — a fixed delay either fires before the feed
      renders or waits longer than it needs to. So poll, and start when the
      screen has stopped growing.

      "Stopped growing", not "found something": the header is on screen before
      the feed is, so the first non-empty answer is the header alone. Taking it
      dropped every step below the fold and opened the Home tour on its
      second-to-last step. This is also what lets a tour armed on a list fire on
      the detail screen the user opens next.
    */
    let best = 0;
    let quiet = 0;
    const timer = globalThis.setInterval(() => {
      const resolved = resolveSteps(tour.steps, t);

      if (resolved.length > best) {
        best = resolved.length;
        quiet = 0;
      } else if (best > 0) {
        quiet += 1;
      }

      const everything = resolved.length === tour.steps.length;
      const settled = best > 0 && quiet >= SETTLE_TICKS;

      if (everything || settled) {
        globalThis.clearInterval(timer);
        setSteps(resolved);
      }
    }, POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [activeTourId, finishTour, location.pathname, t]);

  if (!enabled || !activeTourId || steps.length === 0) return null;

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
      locale={{
        back: t('mweb.tours.previous'),
        close: t('mweb.tours.close'),
        last: t('mweb.tours.finish'),
        next: t('mweb.tours.next'),
        skip: t('mweb.tours.skip'),
      }}
    />
  );
}
