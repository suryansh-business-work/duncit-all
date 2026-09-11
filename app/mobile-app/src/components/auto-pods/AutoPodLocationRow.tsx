import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  labels: AutoPodLabels;
}

/**
 * The city filter at the top of every Auto Pod queue: "Location: Bengaluru"
 * and a Change control that opens the same picker the header uses, against the
 * same store — so the header chip and this row can never disagree. No city
 * selected reads as every city.
 *
 * For a host this is more than a filter: an offer nobody has enrolled in yet
 * takes its city from whatever is chosen here when they assign themselves.
 *
 * The Tamagui twin of mWeb's location bar on the same pages (rule 27).
 */
export function AutoPodLocationRow({ labels }: Readonly<Props>) {
  const { cityLabel } = useLocations();
  const { primary } = useThemeColors();
  const [open, setOpen] = useState(false);
  const value = cityLabel || labels.allLocations;

  return (
    <>
      <XStack
        testID="auto-pods-location-row"
        alignItems="center"
        gap={6}
        paddingLeft={12}
        paddingRight={4}
        height={44}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="place" size={16} color={primary} />
        <Text flex={1} fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
          {`${labels.locationLabel}: ${value}`}
        </Text>
        <XStack
          testID="auto-pods-change-location"
          role="button"
          aria-label={labels.changeLocation}
          onPress={() => setOpen(true)}
          alignItems="center"
          gap={2}
          paddingHorizontal={8}
          height={36}
          borderRadius={999}
          pressStyle={PRESS_STYLE.row}
        >
          <Text fontSize={13} fontWeight="600" color="$primary">
            {labels.changeLocation}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={primary} />
        </XStack>
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
