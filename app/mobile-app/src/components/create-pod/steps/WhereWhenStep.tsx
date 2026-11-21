import { useEffect } from 'react';
import { YStack } from 'tamagui';
import type { FreePodVenueNotice, SpotsBounds } from '@duncit/utils';

import type {
  CreatePodClub,
  CreatePodForm,
  CreatePodLocation,
  CreatePodVenue,
} from '../create-pod.types';
import { PickedVenueNote, usePickedVenueLock } from '../PickedVenueNote';
import { LocationClubStep } from './LocationClubStep';
import { PodSpotsField } from './PodSpotsField';
import { VenueSlotStep } from './VenueSlotStep';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  cityClubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venues: CreatePodVenue[];
  clubVenueIds: Set<string>;
  currencySymbol: string;
  pinnedVenueId?: string;
  /** The venue picked on Venue Details: while the form is on it, the only venue offered. */
  pickedVenueId?: string;
  venueNotice: FreePodVenueNotice;
  spots: SpotsBounds;
  offerMinGuests: number;
  /** Club Admin mode: the pod's club, fixed. */
  pinnedClub: CreatePodClub | null;
}

/**
 * While the form is on the picked venue, a host with a single club around it
 * has that club chosen for them — the one thing left between them and the
 * venue's space and time. Any other pod, and any host with a choice, picks as
 * before. mWeb twin: useStepperSelections.
 */
function usePickedVenueClub(form: CreatePodForm, venueLocked: boolean, clubs: CreatePodClub[]) {
  const clubId = form.watch('club_id');
  const [only] = clubs;
  const sole = clubs.length === 1 && only ? only.id : '';
  useEffect(() => {
    if (venueLocked && !clubId && sole) {
      form.setValue('club_id', sole, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, venueLocked, clubId, sole]);
}

/**
 * Step 2 — Where & when: the locality and club, then the club's partner venue,
 * its space, the guests and the window to offer it (physical), or the meeting
 * and its schedule (virtual). The venue list waits for the club, because the
 * club decides which venues it holds. A pod whose guests are not picked with an
 * offer sizes itself here. A venue picked on Venue Details is the only one on
 * offer. mWeb twin: steps/WhereWhenStep.
 */
export function WhereWhenStep({
  form,
  clubs,
  cityClubs,
  locations,
  venues,
  clubVenueIds,
  currencySymbol,
  pinnedVenueId,
  pickedVenueId,
  venueNotice,
  spots,
  offerMinGuests,
  pinnedClub,
}: Readonly<Props>) {
  const physical = form.watch('pod_mode') === 'PHYSICAL';
  const hasClub = !!pinnedClub || !!form.watch('club_id');
  const guestsWithOffer = physical && !form.watch('partner_request_id');
  const venueLocked = usePickedVenueLock(form, pickedVenueId);
  usePickedVenueClub(form, venueLocked, clubs);
  const venueId = form.watch('venue_id');
  // On the picked venue, VenueSlotStep's list is that venue alone (it is pinned, so it shows).
  const offered = venueLocked ? venues.filter((venue) => venue.id === venueId) : venues;
  return (
    <YStack gap={16} testID="create-pod-where-step">
      {venueLocked ? <PickedVenueNote venues={venues} venueId={venueId} /> : null}
      <LocationClubStep
        form={form}
        clubs={clubs}
        cityClubs={cityClubs}
        locations={locations}
        pinnedClub={pinnedClub}
      />
      {hasClub || !physical ? (
        <VenueSlotStep
          form={form}
          venues={offered}
          clubVenueIds={clubVenueIds}
          currencySymbol={currencySymbol}
          pinnedVenueId={pinnedVenueId}
          venueNotice={venueNotice}
          forClubAdmin={!!pinnedClub}
          spots={spots}
          offerMinGuests={offerMinGuests}
        />
      ) : null}
      {guestsWithOffer ? null : <PodSpotsField form={form} spots={spots} />}
    </YStack>
  );
}
