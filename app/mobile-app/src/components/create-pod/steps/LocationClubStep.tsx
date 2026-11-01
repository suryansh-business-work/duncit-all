import { Controller } from 'react-hook-form';
import { clubCityName } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { ClubPreview } from '../ClubPreview';
import { ClubSearchField } from '../ClubSearchField';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';
import { LocalityField } from './LocalityField';

interface Props {
  form: CreatePodForm;
  /** Clubs scoped to the category, the city and the picked locality. */
  clubs: CreatePodClub[];
  /** The same clubs before the locality narrows them — the per-locality counts. */
  cityClubs: CreatePodClub[];
  locations: CreatePodLocation[];
  /** Club Admin mode: the pod's club, fixed — no club search. */
  pinnedClub?: CreatePodClub | null;
}

/** Where & when's first card — the locality (a searchable dropdown of the city
 * the header has selected) and the club, which opens once a locality is
 * picked. With the category from What they decide which club, venues and
 * products the pod gets. A virtual pod has no area, so it picks only the club.
 * mWeb twin. */
export function LocationClubStep({
  form,
  clubs,
  cityClubs,
  locations,
  pinnedClub = null,
}: Readonly<Props>) {
  const { control, watch } = form;
  const location = locations.find((item) => item.id === watch('location_id')) ?? null;
  const zones = location?.location_zones ?? [];
  const physical = watch('pod_mode') === 'PHYSICAL';
  // A virtual pod has no area; a city with no localities offers all its clubs.
  const pickLocality = physical && zones.length > 0;
  const locality = pickLocality ? watch('locality') : '';

  return (
    <SurfaceCard gap={16} testID="create-pod-place-card">
      {pickLocality && location ? (
        <LocalityField
          form={form}
          zones={zones}
          cityClubs={cityClubs}
          cityName={clubCityName(location)}
          anyArea={!!pinnedClub}
        />
      ) : null}
      {pinnedClub ? null : (
        <Controller
          control={control}
          name="club_id"
          render={({ field, fieldState }) => (
            <ClubSearchField
              clubs={clubs}
              locations={locations}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              required
              locality={locality}
              locked={pickLocality && !locality}
            />
          )}
        />
      )}
      <ClubPreview
        club={pinnedClub ?? clubs.find((club) => club.id === watch('club_id')) ?? null}
      />
    </SurfaceCard>
  );
}
