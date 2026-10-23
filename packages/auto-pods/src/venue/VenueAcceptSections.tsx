import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { autoPodCityLabel, type AutoPodRow, type AutoPodLabels } from '@duncit/utils';
import type { AutoPodVenueOption } from './AutoPodVenuePicker';

interface ContextProps {
  row: AutoPodRow | null;
  venue: AutoPodVenueOption | null;
  /** False when a pinned offer's city does not match the chosen venue's. */
  venueInCity: boolean;
  labels: AutoPodLabels;
}

/**
 * Which offer is being accepted, with which venue, and why that pairing may
 * not be allowed.
 *
 * A sibling of VenueAcceptDialog rather than inline JSX: these four conditions
 * were most of what put the dialog over the cognitive-complexity limit (S3776).
 * `venueInCity` is worked out once by the dialog and passed in, so the rule is
 * stated in one place (rule 26g).
 */
export function VenueAcceptContext({ row, venue, venueInCity, labels }: Readonly<ContextProps>) {
  return (
    <>
      {row ? <Typography variant="subtitle2">{row.pod_title}</Typography> : null}
      {row?.location ? (
        <Typography variant="body2">{labels.pinnedTo(autoPodCityLabel(row.location))}</Typography>
      ) : null}
      {venue ? (
        <Typography variant="body2" data-testid="auto-pod-accepting-with">
          {labels.acceptingWith(venue.venue_name)}
        </Typography>
      ) : (
        <Alert severity="info">{labels.pickVenueFirst}</Alert>
      )}
      {venue && !venueInCity ? (
        <Alert severity="warning">{labels.noVenueInCity(autoPodCityLabel(row?.location))}</Alert>
      ) : null}
    </>
  );
}
