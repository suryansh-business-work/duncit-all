import { YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { TourAnchor } from '@/tours/TourAnchor';
import type {
  CreatePodCategoryIcon,
  CreatePodClub,
  CreatePodForm,
  CreatePodHostCategory,
  CreatePodVenue,
} from '../create-pod.types';
import { PickedVenueNote, usePickedVenueLock } from '../PickedVenueNote';
import { HostCategoryField } from './HostCategoryField';
import { PodModeField } from './PodModeField';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  categoryIcons?: CreatePodCategoryIcon[];
  clubs: CreatePodClub[];
  /** Club Admin mode: the pod's club is fixed, so it has no category to pick. */
  pinnedClub: boolean;
  venues?: CreatePodVenue[];
  /** The venue picked on Venue Details: while the form is on it the pod is physical, so no mode to choose. */
  pickedVenueId?: string;
}

/** Step 1 — What: the category (it scopes the clubs on Where & when and the
 * products on Money) and whether the pod is physical or virtual. mWeb twin. */
export function WhatStep({
  form,
  hostCategories,
  categoryIcons,
  clubs,
  pinnedClub,
  venues = [],
  pickedVenueId,
}: Readonly<Props>) {
  const venueLocked = usePickedVenueLock(form, pickedVenueId);
  return (
    <YStack gap={16} testID="create-pod-what-step">
      {venueLocked ? <PickedVenueNote venues={venues} venueId={form.watch('venue_id')} /> : null}
      {pinnedClub ? null : (
        <TourAnchor tour="create-pod" anchor="create-pod-club">
          <SurfaceCard>
            <HostCategoryField
              form={form}
              hostCategories={hostCategories}
              categoryIcons={categoryIcons}
              clubs={clubs}
              keepVenue={venueLocked}
            />
          </SurfaceCard>
        </TourAnchor>
      )}
      {venueLocked ? null : <PodModeField form={form} pinnedClub={pinnedClub} />}
    </YStack>
  );
}
