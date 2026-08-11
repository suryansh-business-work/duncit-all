import { useEffect, useRef, type ReactNode } from 'react';
import { TourGuideProvider, useTourGuideController } from 'rn-tourguide';

import { useMe } from '@/hooks/useMe';
import { useThemeStore } from '@/stores/theme.store';
import { useToursStore } from '@/stores/tours.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import { TourCard } from './TourCard';
import { TOUR_SETTLE_MS, tourStepCount, visibleTourSteps } from './visibleSteps';

/**
 * How dark the world outside the spotlight goes.
 *
 * Both themes get a dark scrim — a light one would wash out the highlighted
 * element instead of isolating it — but the dark theme needs a deeper one,
 * because it is dimming an interface that is already dark and a weak scrim
 * leaves no visible edge around the hole.
 */
const BACKDROP = { light: 'rgba(16, 16, 20, 0.62)', dark: 'rgba(0, 0, 0, 0.8)' } as const;

/** Rounding of the hole cut out of the scrim, matching the app's card radius. */
const HIGHLIGHT_RADIUS = 16;
/** Breathing room between the highlighted element and the edge of the hole. */
const HIGHLIGHT_PADDING = 10;
/** Spotlight travel between steps. Long enough to follow, short enough to skim. */
const MOVE_MS = 250;

/**
 * The library parks the overlay against window coordinates. This app is
 * edge-to-edge (android/gradle.properties: edgeToEdgeEnabled=true), so content
 * already draws under the status bar and the measured position needs no
 * correction — telling it the bar is "visible" is what turns that correction
 * off. With it off by default every Android highlight sat a status bar too low.
 */
const ANDROID_EDGE_TO_EDGE = true;

/** The card paints its own padding and radius; the animated shell must not. */
const TOOLTIP_SHELL = { paddingTop: 0, paddingBottom: 0, borderRadius: 0 };

/**
 * Runs the active tour. Renders nothing — it is the bridge between the store
 * (which tour the user picked) and rn-tourguide (which zones are on screen).
 */
function TourRunner() {
  const activeTourId = useToursStore((s) => s.activeTourId);
  const activeSteps = useToursStore((s) => s.activeSteps);
  const mountedAnchors = useToursStore((s) => s.mountedAnchors);
  const armTour = useToursStore((s) => s.armTour);
  const finishTour = useToursStore((s) => s.finishTour);
  const userId = useMe().data?.me?.user_id ?? 'anon';

  // One tour key per tour, so a previous walkthrough's zones can never be
  // counted as part of this one.
  const { start, stop, canStart, eventEmitter } = useTourGuideController(activeTourId ?? undefined);

  /**
   * Which tour the overlay is actually open on.
   *
   * Not the same as "which tour is active": a tour armed for a screen the user
   * has not reached yet sits here with its list locked and nothing on display,
   * and must not be treated as one that has been shown.
   */
  const openedFor = useRef<string | null>(null);

  // Resolve the tour against what is on screen, then lock the list in. Every
  // further anchor restarts the wait (the effect re-runs and clears the timer),
  // so the list is frozen once the screen has stopped growing — and a tour armed
  // on a list screen simply waits here until the user opens the detail screen
  // its anchors live on.
  useEffect(() => {
    if (!activeTourId || activeSteps.length > 0) return undefined;
    const resolved = visibleTourSteps(activeTourId, mountedAnchors);
    if (resolved.length === 0) return undefined;
    if (resolved.length === tourStepCount(activeTourId)) {
      armTour(resolved);
      return undefined;
    }
    const timer = setTimeout(() => armTour(resolved), TOUR_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [activeTourId, activeSteps.length, mountedAnchors, armTour]);

  // Zones register as they render, so the overlay can only open once the list is
  // locked AND the first zone has reported in.
  useEffect(() => {
    if (!activeTourId || activeSteps.length === 0 || !canStart) return;
    openedFor.current = activeTourId;
    start();
    // `start` is rebuilt every render by the library's hook; depending on it
    // would re-run this on every registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTourId, activeSteps.length, canStart]);

  /*
    Leaving the screen ends the tour.

    Its targets go with the screen, and the overlay measures a highlight against
    the view it was handed: an Android back press mid-walkthrough left the scrim
    up over the next screen, spotlighting a rectangle that no longer existed and
    hanging on the next step. mWeb ends a tour on a route change for the same
    reason; ending counts as shown, exactly like Skip.
  */
  useEffect(() => {
    if (!activeTourId || openedFor.current !== activeTourId) return;
    if (activeSteps.some((step) => mountedAnchors.includes(step.anchor))) return;
    stop();
    // `stop`, like `start`, is a fresh closure on every render of the library's hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTourId, activeSteps, mountedAnchors]);

  // Finished or skipped — both count as shown, matching mWeb.
  useEffect(() => {
    if (!activeTourId || !eventEmitter) return undefined;
    const onStop = () => {
      openedFor.current = null;
      fireAndForget(finishTour(userId, activeTourId));
    };
    eventEmitter.on('stop', onStop);
    return () => eventEmitter.off('stop', onStop);
  }, [activeTourId, eventEmitter, finishTour, userId]);

  return null;
}

/**
 * Drives the native guided tours.
 *
 * The steps come from @duncit/tours, the same registry mWeb reads, so the two
 * platforms show the same content in the same order. Only the overlay differs:
 * mWeb renders React Joyride, native renders rn-tourguide, which cuts the
 * highlight out of a react-native-svg scrim and finds its target by ZONE NUMBER
 * rather than by selector — see TourAnchor for how an anchor becomes that number.
 */
export function NativeTourProvider({ children }: Readonly<{ children: ReactNode }>) {
  const scheme = useThemeStore((s) => s.scheme);

  return (
    <TourGuideProvider
      tooltipComponent={TourCard}
      tooltipStyle={TOOLTIP_SHELL}
      backdropColor={BACKDROP[scheme]}
      borderRadius={HIGHLIGHT_RADIUS}
      maskOffset={HIGHLIGHT_PADDING}
      animationDuration={MOVE_MS}
      androidStatusBarVisible={ANDROID_EDGE_TO_EDGE}
      // The scrim is a step in a walkthrough, not a dimmer: tapping through it
      // would fire the button underneath while the tour still points at it.
      preventOutsideInteraction
    >
      {children}
      <TourRunner />
    </TourGuideProvider>
  );
}
