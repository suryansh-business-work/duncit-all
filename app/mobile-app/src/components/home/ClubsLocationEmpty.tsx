import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Empty state shown on the Clubs tab when the selected locality has no active
 * clubs. Offers a "Reset Location" action that re-opens the location picker so
 * the user can pick a different location. */
export function ClubsLocationEmpty() {
  const { onPrimary } = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <YStack
      testID="clubs-location-empty"
      alignItems="center"
      gap={14}
      paddingVertical={48}
      paddingHorizontal={24}
    >
      <MaterialIcons name="location-off" size={40} color="#9aa0a6" />
      <Text fontSize={14} fontWeight="700" color="$muted" textAlign="center">
        No Clubs operating at the selected location,
      </Text>
      <XStack
        testID="clubs-location-reset"
        role="button"
        aria-label="Reset Location"
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={6}
        paddingHorizontal={18}
        height={44}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="my-location" size={16} color={onPrimary} />
        <Text fontSize={14} fontWeight="900" color="$onPrimary">
          Reset Location
        </Text>
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </YStack>
  );
}
