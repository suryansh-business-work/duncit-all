import { Card } from '@mui/material';
import { clubCityName } from '@duncit/utils';
import ClubPreview from '../ClubPreview';
import ClubField from './ClubField';
import LocalityField from './LocalityField';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  /** Clubs scoped to the category, the city and the picked locality. */
  clubs: CreatePodClub[];
  /** The same clubs before the locality narrows them — the per-locality counts. */
  cityClubs: CreatePodClub[];
  locations: CreatePodLocation[];
}

/** Where & when's first card — the locality (a searchable dropdown of the city
 * the header has selected) and the club, which opens once a locality is
 * picked. With the category from What they decide which club, venues and
 * products the pod gets. A virtual pod has no area, so it picks only the club. */
export default function LocationClubStep({ form, clubs, cityClubs, locations }: Readonly<Props>) {
  const { watch } = form;
  const location = locations.find((item) => item.id === watch('location_id')) ?? null;
  const zones = location?.location_zones ?? [];
  const physical = watch('pod_mode') === 'PHYSICAL';
  // A virtual pod has no area; a city with no localities offers all its clubs.
  const pickLocality = physical && zones.length > 0;
  const locality = pickLocality ? watch('locality') : '';

  return (
    <Card data-testid="create-pod-place-card" sx={{ p: 2, display: 'grid', gap: 2 }}>
      {pickLocality && location && (
        <LocalityField
          form={form}
          zones={zones}
          cityClubs={cityClubs}
          cityName={clubCityName(location)}
          locations={locations}
        />
      )}
      <ClubField
        form={form}
        clubs={clubs}
        locations={locations}
        locality={locality}
        locked={pickLocality && !locality}
      />
      <ClubPreview club={clubs.find((club) => club.id === watch('club_id')) ?? null} />
    </Card>
  );
}
