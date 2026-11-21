import { Alert, AlertTitle } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodVenue } from './create-pod.types';

interface Props {
  venues: CreatePodVenue[];
  venueId: string;
}

/**
 * Over What and Where & when while the pod is on the venue picked from Venue
 * Details: says the venue and a physical pod are already chosen, so the host
 * knows why there is no mode or venue list to pick from. Native twin.
 */
export default function PickedVenueNote({ venues, venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const venue = venues.find((row) => row.id === venueId);
  if (!venue) return null;
  return (
    <Alert data-testid="create-pod-picked-venue" severity="info" icon={<StorefrontIcon fontSize="inherit" />}>
      <AlertTitle sx={{ fontWeight: 700 }}>{t('mweb.createPod.pickedVenue.title', { vars: { venue: venue.venue_name } })}</AlertTitle>
      {t('mweb.createPod.pickedVenue.hint')}
    </Alert>
  );
}
