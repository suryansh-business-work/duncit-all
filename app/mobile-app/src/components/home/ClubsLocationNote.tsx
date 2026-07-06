import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Info banner above the Clubs search telling the user which location's clubs are
 * shown, with a tappable "here" link that opens the location picker. Renders
 * nothing until a location is selected (the list is unfiltered until then). */
export function ClubsLocationNote() {
  const { selectedId, cityLabel, zoneName } = useLocations();
  const { primary } = useThemeColors();
  const [open, setOpen] = useState(false);

  if (!selectedId || !cityLabel) return null;
  const label = zoneName ? `${cityLabel} · ${zoneName}` : cityLabel;

  return (
    <>
      <XStack
        testID="clubs-location-note"
        alignItems="flex-start"
        gap={8}
        marginHorizontal={16}
        marginTop={12}
        padding={10}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="info-outline" size={16} color={primary} />
        <Text flex={1} fontSize={12.5} color="$muted" lineHeight={18}>
          Showing clubs in{' '}
          <Text fontWeight="800" color="$color">
            {label}
          </Text>
          . Want clubs from another location?{' '}
          <Text
            testID="clubs-location-note-change"
            color="$primary"
            fontWeight="800"
            textDecorationLine="underline"
            onPress={() => setOpen(true)}
          >
            Change your location here
          </Text>
          .
        </Text>
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
