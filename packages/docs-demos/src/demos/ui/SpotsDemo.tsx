import { useEffect, useState } from 'react';
import { SpotsStepper, type SpotsStepperLabels } from '@duncit/ui';

export interface SpotsMock {
  no_of_spots: number;
  min_pax: number;
  venue_capacity: number;
  seats_taken: number;
}

/** The words a surface hands the control — mWeb passes `mwebSpotsLabels(t)`. */
const SPOTS_LABELS: SpotsStepperLabels = {
  totalSpots: 'Total spots',
  hint: 'Number of available tickets.',
  fixedHint: 'Set by the venue space you picked.',
  increase: 'Increase spots',
  decrease: 'Decrease spots',
};

/**
 * The control is uncontrolled-by-design: it owns no value, so a demo has to
 * hold one. Hoisted to module scope — a component defined inside `render`
 * remounts on every keystroke in the mock editor (S6478).
 */
export function SpotsDemo({ mock }: Readonly<{ mock: SpotsMock }>) {
  const [spots, setSpots] = useState(mock.no_of_spots);
  useEffect(() => {
    setSpots(mock.no_of_spots);
  }, [mock.no_of_spots]);
  // Exactly what the server's `podSpotLimits` returns for a Club Admin: the
  // floor is whichever is higher, the activity's minimum or the seats sold.
  const min = Math.max(mock.min_pax, mock.seats_taken);
  const boundsHint = `The space this pod booked holds ${mock.venue_capacity} people. ${mock.seats_taken} seats are already taken.`;
  return (
    <SpotsStepper
      labels={SPOTS_LABELS}
      value={spots}
      onChange={setSpots}
      min={min}
      max={mock.venue_capacity}
      slidable={mock.venue_capacity > min}
      boundsHint={boundsHint}
    />
  );
}
