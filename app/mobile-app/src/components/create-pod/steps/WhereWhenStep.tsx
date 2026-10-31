import { YStack } from 'tamagui';
import type { FreePodVenueNotice, SpotsBounds } from '@duncit/utils';

import type { CreatePodClub, CreatePodForm, CreatePodLocation, CreatePodVenue } from '../create-pod.types';
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
  venueNotice: FreePodVenueNotice;
  spots: SpotsBounds;
  offerMinGuests: number;
  /** Club Admin mode: the pod's club, fixed. */
  pinnedClub: CreatePodClub | null;
}

/**
 * Step 2 — Where & when: the locality and club, then the club's partner venue,
 * its space, the guests and the window to offer it (physical), or the meeting
 * and its schedule (virtual). The venue list waits for the club, because the
 * club decides which venues it holds. A pod whose guests are not picked with an
 * offer sizes itself here. mWeb twin: steps/WhereWhenStep.
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
  venueNotice,
  spots,
  offerMinGuests,
  pinnedClub,
}: Readonly<Props>) {
  const physical = form.watch('pod_mode') === 'PHYSICAL';
  const hasClub = !!pinnedClub || !!form.watch('club_id');
  const guestsWithOffer = physical && !form.watch('partner_request_id');
  return (
    <YStack gap={16} testID="create-pod-where-step">
      <LocationClubStep form={form} clubs={clubs} cityClubs={cityClubs} locations={locations} pinnedClub={pinnedClub} />
      {hasClub || !physical ? (
        <VenueSlotStep
          form={form}
          venues={venues}
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
