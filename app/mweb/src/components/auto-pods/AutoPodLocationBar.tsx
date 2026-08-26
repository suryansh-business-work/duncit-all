import type { AutoPodLabels } from '@duncit/utils';
import LocationChangeBar from '../LocationChangeBar';

interface Props {
  /** The selected Location id ('' when the whole country is showing). */
  locationId: string;
  /** Display name of that city, once the locations list has resolved it. */
  cityLabel?: string;
  labels: AutoPodLabels;
}

/**
 * The Auto Pod queues' location row: "Location: <city>" (or the all-cities
 * copy) and a Change control that opens the header's location picker. The
 * city chosen here is also what a host's first enrolment pins an offer to.
 * Native twin: AutoPodLocationBar (rule 27 — same wording through labels).
 */
export default function AutoPodLocationBar({ locationId, cityLabel, labels }: Readonly<Props>) {
  const city = locationId && cityLabel ? cityLabel : labels.allLocations;

  return (
    <LocationChangeBar
      testId="auto-pod-location-bar"
      ariaLabel={labels.changeLocation}
      label={`${labels.locationLabel}: ${city}`}
      changeLabel={labels.changeLocation}
    />
  );
}
