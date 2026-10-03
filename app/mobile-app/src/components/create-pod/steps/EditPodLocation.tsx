import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { LocationDialog } from '@/components/LocationDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/**
 * Step 1's "Edit location" beside Locality: opens the app's common location
 * picker and puts the pick into THIS pod (city, plus the area when one was
 * chosen) — the header stays as it was and the rest of the form is kept.
 * mWeb twin: steps/EditPodLocation (rule 27).
 */
export function EditPodLocation({ form }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const [open, setOpen] = useState(false);
  const label = t('mweb.createPod.editLocation');

  return (
    <>
      <XStack
        testID="create-pod-edit-location"
        role="button"
        aria-label={label}
        tabIndex={0}
        onPress={() => setOpen(true)}
        minHeight={44}
        alignItems="center"
        gap={4}
        paddingHorizontal={8}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="edit-location-alt" size={18} color={accent} />
        <Text fontSize={13} fontWeight="600" color={accent}>
          {label}
        </Text>
      </XStack>
      <LocationDialog
        open={open}
        onClose={() => setOpen(false)}
        initialLocationId={form.getValues('location_id')}
        onApply={(location, zone) => applyPodLocation(form, location.id, zone)}
      />
    </>
  );
}
