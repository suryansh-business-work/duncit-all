import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';
import { clubCityName } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import { ChipSelectField } from '../ChipSelectField';
import { ClubPreview } from '../ClubPreview';
import { ClubSearchField } from '../ClubSearchField';
import type {
  CreatePodClub,
  CreatePodForm,
  CreatePodHostCategory,
  CreatePodLocation,
} from '../create-pod.types';
import { HostCategoryField } from './HostCategoryField';
import { LocalityField } from './LocalityField';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  /** Clubs scoped to the category, the city and the picked locality. */
  clubs: CreatePodClub[];
  /** The same clubs before the locality narrows them — the per-locality counts. */
  cityClubs: CreatePodClub[];
  locations: CreatePodLocation[];
  /** Club Admin mode: the pod's club, fixed — no category and no club search. */
  pinnedClub?: CreatePodClub | null;
}

/** Step 1 — category, pod mode, then the locality (a searchable dropdown of the
 * city the header has selected) and the club, which opens once a locality is
 * picked. Together they decide which club, venues and products the pod gets. */
export function LocationClubStep({
  form,
  hostCategories,
  clubs,
  cityClubs,
  locations,
  pinnedClub = null,
}: Readonly<Props>) {
  const { control, getValues, setValue, watch } = form;
  const { t } = useTranslation();
  const modes = [
    { value: 'PHYSICAL', label: t('mweb.createPod.modePhysical') },
    { value: 'VIRTUAL', label: t('mweb.createPod.modeVirtual') },
  ];
  const location = locations.find((item) => item.id === watch('location_id')) ?? null;
  const zones = location?.location_zones ?? [];
  const physical = watch('pod_mode') === 'PHYSICAL';
  // A virtual pod has no area; a city with no localities offers all its clubs.
  const pickLocality = physical && zones.length > 0;
  const locality = pickLocality ? watch('locality') : '';

  return (
    <YStack gap={16}>
      {/* First field: the category scopes the clubs here AND the products on
          step 4. A Club Admin's pod is pinned to its club, so it has no pick.
          mWeb twin (rule 27). */}
      {pinnedClub ? null : (
        <TourAnchor tour="create-pod" anchor="create-pod-club">
          <SurfaceCard>
            <HostCategoryField form={form} hostCategories={hostCategories} />
          </SurfaceCard>
        </TourAnchor>
      )}

      <SurfaceCard>
        <Controller
          control={control}
          name="pod_mode"
          render={({ field }) => (
            <ChipSelectField
              label={t('mweb.createPod.podMode')}
              options={modes}
              value={field.value}
              onChange={(next) => {
                field.onChange(next);
                // The club list depends on the mode, so the old pick may not be in it.
                if (!pinnedClub) setValue('club_id', '', { shouldDirty: true });
                // FREE is virtual-only — a VIRTUAL+FREE pick must not survive
                // the switch to PHYSICAL.
                if (next === 'PHYSICAL' && getValues('pod_type') !== 'PAID') {
                  setValue('pod_type', 'PAID', { shouldDirty: true });
                  // FREE forced the price to ₹0 — the now-paid pod starts blank.
                  setValue('pod_amount_text', '', { shouldDirty: true });
                }
              }}
              testID="create-pod-mode"
            />
          )}
        />
      </SurfaceCard>

      <SurfaceCard gap={16}>
        {pickLocality && location ? (
          <LocalityField
            form={form}
            zones={zones}
            cityClubs={cityClubs}
            cityName={clubCityName(location)}
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
    </YStack>
  );
}
