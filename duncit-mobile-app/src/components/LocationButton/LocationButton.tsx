import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Header chip showing the selected city; opens the location picker. */
export function LocationButton() {
  const { cityLabel } = useLocations();
  const { color } = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <XStack
        testID="location-button"
        role="button"
        aria-label="Select location"
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={3}
        maxWidth={116}
        height={36}
        paddingHorizontal={10}
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="place" size={15} color={color} />
        <Text fontSize={12} fontWeight="800" color="$color" numberOfLines={1}>
          {cityLabel || 'Location'}
        </Text>
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
