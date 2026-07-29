import { useEffect, type ReactElement } from 'react';
import { AttachStep, type ChildProps } from 'react-native-spotlight-tour';
import type { TourId } from '@duncit/tours';

import { useToursStore } from '@/stores/tours.store';
import { visibleStepIndex } from './visibleSteps';

interface Props {
  /** The tour this element belongs to. */
  tour: TourId;
  /** The step's anchor name, as declared in @duncit/tours. */
  anchor: string;
  /** AttachStep measures its child, so it must accept a ref and layout props. */
  children: ReactElement<ChildProps>;
}

/**
 * Marks an element as a tour step's target.
 *
 * Two jobs. It tells the store this anchor is on screen, so the provider builds
 * a step for it and skips the ones that are not mounted — a step with nothing to
 * spotlight renders an empty overlay. And it resolves its own position in that
 * same visible list, so screens never hard-code step numbers, which would point
 * at the wrong element the moment a step is inserted.
 *
 * When another tour is running (or none is) the child renders untouched.
 */
export function TourAnchor({ tour, anchor, children }: Readonly<Props>) {
  const activeTourId = useToursStore((s) => s.activeTourId);
  const mountedAnchors = useToursStore((s) => s.mountedAnchors);
  const registerAnchor = useToursStore((s) => s.registerAnchor);
  const unregisterAnchor = useToursStore((s) => s.unregisterAnchor);

  useEffect(() => {
    registerAnchor(anchor);
    return () => unregisterAnchor(anchor);
  }, [anchor, registerAnchor, unregisterAnchor]);

  if (activeTourId !== tour) return children;

  const index = visibleStepIndex(activeTourId, mountedAnchors, anchor);
  if (index < 0) return children;

  return <AttachStep index={index}>{children}</AttachStep>;
}
