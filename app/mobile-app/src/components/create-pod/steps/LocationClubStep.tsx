import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { MapEmbed } from '@/components/MapEmbed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChipSelectField } from '../ChipSelectField';
import { ClubPreview } from '../ClubPreview';
import { ClubSearchField } from '../ClubSearchField';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';

const MODES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
}

const locationLabel = (location: CreatePodLocation) =>
  location.city && location.city !== location.location_name
    ? `${location.location_name} (${location.city})`
    : location.location_name;

/** Step 2 — pod city + locality (chosen in the header location picker, which
 * shows the club count per locality), the pod mode and the club. The category
 * moved above the page title, so the club list arrives already scoped to it. */
export function LocationClubStep({ form, clubs, locations }: Readonly<Props>) {
  const { control, getValues, setValue, watch } = form;
  const { primary } = useThemeColors();
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
    <YStack gap={14}>
      <YStack gap={6} padding={12} borderWidth={1} borderColor="$borderColor" borderRadius={12}>
        <XStack alignItems="center" gap={8}>
          <MaterialIcons name="place" size={18} color={primary} />
          <YStack flex={1}>
            <Text fontSize={12} fontWeight="600" color="$muted">
              Pod location
            </Text>
            <Text testID="create-pod-location-label" fontSize={15} fontWeight="700" color="$color">
              {location
                ? [locationLabel(location), location.state].filter(Boolean).join(', ')
                : 'No location selected'}
            </Text>
            {locality ? (
              <Text testID="create-pod-locality-label" fontSize={12} color="$muted">
                Locality: {locality}
              </Text>
            ) : null}
          </YStack>
          <XStack
            testID="create-pod-change-location"
            role="button"
            aria-label="Change location"
            onPress={() => setPickerOpen(true)}
            paddingHorizontal={12}
            paddingVertical={8}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={10}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize={13} fontWeight="600" color="$color">
              Change
            </Text>
          </XStack>
        </XStack>
        <Text fontSize={12} color="$muted">
          Pick your city and locality — the picker shows how many clubs each locality has.
        </Text>
      </YStack>

      {location ? (
        <MapEmbed
          query={[locationLabel(location), location.state].filter(Boolean).join(', ')}
          height={170}
        />
      ) : null}

      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ChipSelectField
            label="Mode"
            options={MODES}
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
      <ClubPreview club={clubs.find((club) => club.id === watch('club_id')) ?? null} />

      <LocationDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onApply={(loc, zone) => applyLocation(loc.id, zone)}
        initialLocationId={locationId}
      />
    </YStack>
  );
}
