import { Stack } from '@mui/material';
import type { FreePodVenueNotice, SpotsBounds } from '@duncit/utils';
import LocationClubStep from './LocationClubStep';
import PodSpotsField from './PodSpotsField';
import VenueSlotStep from './VenueSlotStep';
import type { CreatePodClub, CreatePodForm, CreatePodLocation, CreatePodVenue } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  cityClubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venues: CreatePodVenue[];
  clubVenueIds: Set<string>;
  venueNotice: FreePodVenueNotice;
  spots: SpotsBounds;
  offerMinGuests: number;
}

/**
 * Step 2 — Where & when: the locality and club, then the club's partner venue,
 * its space, the guests and the window to offer it (physical), or the meeting
 * and its schedule (virtual). The venue list waits for the club, because the
 * club decides which venues it holds. A pod whose guests are not picked with an
 * offer sizes itself here. Native twin: WhereWhenStep.
 */
export default function WhereWhenStep({ form, clubs, cityClubs, locations, venues, clubVenueIds, venueNotice, spots, offerMinGuests }: Readonly<Props>) {
  const physical = form.watch('pod_mode') === 'PHYSICAL';
  const clubId = form.watch('club_id');
  const guestsWithOffer = physical && !form.watch('partner_request_id');
  return (
    <Stack data-testid="create-pod-where-step" spacing={2}>
      <LocationClubStep form={form} clubs={clubs} cityClubs={cityClubs} locations={locations} />
      {(clubId || !physical) && (
        <VenueSlotStep form={form} venues={venues} clubVenueIds={clubVenueIds} venueNotice={venueNotice} spots={spots} offerMinGuests={offerMinGuests} />
      )}
      {!guestsWithOffer && <PodSpotsField form={form} spots={spots} />}
    </Stack>
  );
}
