import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { MapEmbed } from '@/components/MapEmbed';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from '../ChipSelectField';
import { ClubPreview } from '../ClubPreview';
import { ClubSearchField } from '../ClubSearchField';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  /** Club Admin mode: the pod's club, fixed — the club search is not shown. */
  pinnedClub?: CreatePodClub | null;
}

const locationLabel = (location: CreatePodLocation) =>
  location.city && location.city !== location.location_name
    ? `${location.location_name} (${location.city})`
    : location.location_name;

/** Step 2 — pod city + locality (chosen in the header location picker, which
 * shows the club count per locality), the pod mode and the club. The category
 * moved above the page title, so the club list arrives already scoped to it. */
export function LocationClubStep({ form, clubs, locations, pinnedClub = null }: Readonly<Props>) {
  const { control, getValues, setValue, watch } = form;
  const { accent } = useThemeColors();
  const { t } = useTranslation();
  const modes = [
    { value: 'PHYSICAL', label: t('mweb.createPod.modePhysical') },
    { value: 'VIRTUAL', label: t('mweb.createPod.modeVirtual') },
  ];
  const locationId = watch('location_id');
  const locality = watch('locality');
  const location = locations.find((item) => item.id === locationId);
  const [pickerOpen, setPickerOpen] = useState(false);

  // The header LocationDialog closes itself on apply; we just capture its pick.
  const applyLocation = (nextId: string, zone: string) => {
    if (nextId !== locationId) {
      setValue('location_id', nextId, { shouldDirty: true, shouldValidate: true });
      // Venue + slot belong to the old city — reselect them for the new one.
      setValue('venue_id', '', { shouldDirty: true });
      setValue('venue_slot_id', '', { shouldDirty: true });
    }
    setValue('locality', zone, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <YStack gap={16}>
      <SurfaceCard>
        <XStack alignItems="center" gap={12}>
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$soft"
          >
            <MaterialIcons name="place" size={20} color={accent} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={12} fontWeight="500" color="$muted">
              {t('mweb.createPod.podLocation')}
            </Text>
            <Text testID="create-pod-location-label" fontSize={15} fontWeight="600" color="$color">
              {location
                ? [locationLabel(location), location.state].filter(Boolean).join(', ')
                : t('mweb.createPod.noLocationSelected')}
            </Text>
            {locality ? (
              <Text testID="create-pod-locality-label" fontSize={12} color="$muted">
                {t('mweb.createPod.localityLabel', { vars: { locality } })}
              </Text>
            ) : null}
          </YStack>
          <XStack
            testID="create-pod-change-location"
            role="button"
            aria-label={t('mweb.createPod.changeLocation')}
            onPress={() => setPickerOpen(true)}
            height={36}
            alignItems="center"
            paddingHorizontal={14}
            borderWidth={1}
            borderColor="$primary"
            borderRadius={999}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={13} fontWeight="600" color="$primary">
              {t('mweb.createPod.change')}
            </Text>
          </XStack>
        </XStack>
      </SurfaceCard>

      {location ? (
        <MapEmbed
          query={[locationLabel(location), location.state].filter(Boolean).join(', ')}
          height={170}
        />
      ) : null}

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
      <SurfaceCard gap={12}>
        {pinnedClub ? null : (
          <Controller
            control={control}
            name="club_id"
            render={({ field, fieldState }) => (
              <ClubSearchField
                clubs={clubs}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                required
              />
            )}
          />
        )}
        <ClubPreview
          club={pinnedClub ?? clubs.find((club) => club.id === watch('club_id')) ?? null}
        />
      </SurfaceCard>

      <LocationDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onApply={(loc, zone) => applyLocation(loc.id, zone)}
        initialLocationId={locationId}
      />
    </YStack>
  );
}
