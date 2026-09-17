import { useCallback, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { clubCityName, placeLabel } from '@duncit/utils';

import { FieldLabel } from '@/components/Field';
import { LocationDialog } from '@/components/LocationDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type { CreatePodForm, CreatePodLocation } from '../create-pod.types';
import { useDeviceLocality } from './useDeviceLocality';

interface Props {
  form: CreatePodForm;
  locations: CreatePodLocation[];
}

/**
 * Step 1 — the locality, under the category. It opens on the area this device
 * is in, highlighted like a picked category because a pod has exactly one, and
 * "Edit location" opens the same picker step 2's Change does. The area is what
 * scopes the clubs step 2 offers. mWeb twin (rule 27).
 */
export function LocalityField({ form, locations }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent, onPrimary } = useThemeColors();
  const locationId = form.watch('location_id');
  const locality = form.watch('locality');
  const location = locations.find((item) => item.id === locationId) ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  // A resumed draft already has its area; only a fresh pod asks the device.
  const [lookUpDevice] = useState(() => !form.getValues('locality'));
  // A pick made while the device lookup is still out wins over its answer.
  const picked = useRef(false);
  const onFound = useCallback(
    (id: string, zone: string) => {
      if (!picked.current) applyPodLocation(form, id, zone);
    },
    [form],
  );
  const device = useDeviceLocality(locations, lookUpDevice, onFound);

  const label = location
    ? placeLabel(locality, clubCityName(location))
    : t('mweb.createPod.noLocationSelected');
  const editLabel = t('mweb.createPod.editLocation');

  return (
    <YStack gap={6} testID="create-pod-locality">
      <FieldLabel label={t('mweb.createPod.localityHeading')} testID="create-pod-locality-label" />
      <Text fontSize={12} color="$muted">
        {t('mweb.createPod.localityHint')}
      </Text>
      <XStack alignItems="center" flexWrap="wrap" gap={8}>
        <XStack
          testID="create-pod-locality-selected"
          aria-live="polite"
          minHeight={36}
          alignItems="center"
          gap={6}
          paddingHorizontal={14}
          borderRadius={999}
          backgroundColor="$primary"
        >
          {device.detecting ? (
            <Spinner size="small" color="$onPrimary" />
          ) : (
            <MaterialIcons name="place" size={16} color={onPrimary} />
          )}
          <Text fontSize={13} fontWeight="600" color="$onPrimary">
            {device.detecting ? t('mweb.createPod.localityDetecting') : label}
          </Text>
        </XStack>
        <XStack
          testID="create-pod-edit-location"
          tabIndex={0}
          role="button"
          aria-label={editLabel}
          onPress={() => setPickerOpen(true)}
          minHeight={36}
          alignItems="center"
          gap={4}
          paddingHorizontal={8}
          borderRadius={999}
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="edit-location-alt" size={18} color={accent} />
          <Text fontSize={13} fontWeight="600" color="$accent">
            {editLabel}
          </Text>
        </XStack>
      </XStack>
      {device.failed ? (
        <Text testID="create-pod-locality-detect-failed" role="status" fontSize={12} color="$muted">
          {t('mweb.createPod.localityDetectFailed')}
        </Text>
      ) : null}
      <LocationDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onApply={(next, zone) => {
          picked.current = true;
          applyPodLocation(form, next.id, zone);
        }}
        initialLocationId={locationId}
      />
    </YStack>
  );
}
