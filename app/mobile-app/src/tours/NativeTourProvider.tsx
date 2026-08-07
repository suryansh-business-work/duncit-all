import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  SpotlightTourProvider,
  type SpotlightTour,
  type TourStep as SpotlightStep,
} from 'react-native-spotlight-tour';

import { useMe } from '@/hooks/useMe';
import { useToursStore } from '@/stores/tours.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import { TourCard } from './TourCard';
import { visibleTourSteps } from './visibleSteps';

/**
 * Drives the native guided tours.
 *
 * The steps come from @duncit/tours, the same registry mWeb reads, so the two
 * platforms show the same content in the same order. Only the overlay differs:
 * mWeb renders React Joyride, native renders react-native-spotlight-tour, which
 * highlights by wrapping an element in <AttachStep index={n}> rather than by
 * selector — see TourAnchor for how an anchor name becomes that index.
 */
/**
 * Turn a registry tour into spotlight-tour steps.
 *
 * Exported and pure so the wiring can be tested without the library: its
 * tooltip only renders once the host has measured a real layout, which jest
 * never does, so a render-based test would prove nothing about this mapping.
 */
export function buildSpotlightSteps(
  tourId: string | null,
  mountedAnchors: readonly string[],
): SpotlightStep[] {
  const steps = visibleTourSteps(tourId, mountedAnchors);
  return steps.map((step, index) => ({
    render: ({ isFirst, isLast, next, previous, stop }) => (
      <TourCard
        title={step.title}
        body={step.body}
        position={index + 1}
        total={steps.length}
        isFirst={isFirst}
        isLast={isLast}
        onPrevious={previous}
        // The last step's primary button finishes rather than advancing past
        // the end — spotlight-tour's `next` is a no-op there.
        onNext={isLast ? stop : next}
        onSkip={stop}
      />
    ),
  }));
}

export function NativeTourProvider({ children }: Readonly<{ children: ReactNode }>) {
  const tourRef = useRef<SpotlightTour>(null);
  const activeTourId = useToursStore((s) => s.activeTourId);
  const finishTour = useToursStore((s) => s.finishTour);
  const userId = useMe().data?.me?.user_id ?? 'anon';

  const mountedAnchors = useToursStore((s) => s.mountedAnchors);
  const steps = useMemo(
    () => buildSpotlightSteps(activeTourId, mountedAnchors),
    [activeTourId, mountedAnchors],
  );

  /**
   * Which tour has already been started, so a late anchor cannot restart it.
   *
   * `steps` changes every time another anchor mounts, and the screen fills in
   * as its data lands — so a section arriving after the walkthrough began sent
   * it back to step one. The delay below still debounces the arrivals BEFORE
   * the start, which is what makes the tour open on its first step rather than
   * on whichever part of the screen rendered first.
   */
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!activeTourId) {
      startedFor.current = null;
      return undefined;
    }
    // The anchors mount with the destination screen, so give that a beat before
    // starting — otherwise the first step has nothing to spotlight.
    if (steps.length === 0 || startedFor.current === activeTourId) return undefined;
    const timer = setTimeout(() => {
      startedFor.current = activeTourId;
      tourRef.current?.start();
    }, 400);
    return () => clearTimeout(timer);
  }, [steps, activeTourId]);

  return (
    <SpotlightTourProvider
      ref={tourRef}
      steps={steps}
      overlayOpacity={0.7}
      nativeDriver
      // Finished or skipped — both count as shown, matching mWeb.
      onStop={() => {
        if (activeTourId) fireAndForget(finishTour(userId, activeTourId));
      }}
    >
      {children}
    </SpotlightTourProvider>
  );
}
