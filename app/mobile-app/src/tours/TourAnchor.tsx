import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { TourGuideZone } from 'rn-tourguide';
import type { TourId } from '@duncit/tours';

import { useToursStore } from '@/stores/tours.store';
import { useTranslation } from '@/hooks/useTranslation';

/** Extra clearance above a target in the screen's lower half, in px. */
const TOOLTIP_LIFT = 72;

interface Props {
  /** The tour this element belongs to. */
  tour: TourId;
  /** The step's anchor name, as declared in @duncit/tours. */
  anchor: string;
  /**
   * Style for the wrapper the highlight is measured from. rn-tourguide always
   * wraps its target in a plain View, so an anchor placed inside a row or a
   * flexed column has to pass the layout on or the wrapper collapses it.
   */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Marks an element as a tour step's target.
 *
 * Two jobs. It tells the store this anchor is on screen, so the runner can
 * resolve the tour against what actually rendered and drop steps with nothing
 * to spotlight. And once the runner has frozen that list it resolves its own
 * ZONE NUMBER from it — screens never hard-code step numbers, which would point
 * at the wrong element the moment a step is inserted into the registry.
 *
 * Outside its own running tour the child renders on its own, with no wrapper at
 * all, so an idle tour costs nothing in layout terms.
 */
export function TourAnchor({ tour, anchor, style, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const activeTourId = useToursStore((s) => s.activeTourId);
  const activeSteps = useToursStore((s) => s.activeSteps);
  const registerAnchor = useToursStore((s) => s.registerAnchor);
  const unregisterAnchor = useToursStore((s) => s.unregisterAnchor);

  useEffect(() => {
    registerAnchor(anchor);
    return () => unregisterAnchor(anchor);
  }, [anchor, registerAnchor, unregisterAnchor]);

  const index = activeTourId === tour ? activeSteps.findIndex((s) => s.anchor === anchor) : -1;
  const step = activeSteps[index];
  if (!step) return <>{children}</>;

  return (
    <TourGuideZone
      tourKey={tour}
      // Zones are 1-based, and `zone` doubles as the step's sort order.
      zone={index + 1}
      text={t(step.bodyKey)}
      style={style}
      // The tooltip is parked a fixed distance above a target that sits in the
      // lower half of the screen. Our card carries a title, body and a button
      // row, so it needs more room than the library's own one-line tooltip.
      tooltipBottomOffset={TOOLTIP_LIFT}
    >
      {children}
    </TourGuideZone>
  );
}
