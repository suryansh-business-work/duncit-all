import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';

const DEFAULT_TAGLINE = 'It All Starts Here!';

interface Props {
  tagline?: string | null;
  /** When false (studio/survey headers) only the tagline shows — no location row. */
  showLocation: boolean;
}

/** Home header left block: the admin-configurable tagline on top with the
 * tappable city (+ chevron) beneath. Replaces the old logo + mascot. */
export function HeaderGreeting({ tagline, showLocation }: Readonly<Props>) {
  const { cityLabel } = useLocations();
  const { color } = useThemeColors();
  const [open, setOpen] = useState(false);
  const title = tagline?.trim() || DEFAULT_TAGLINE;

  return (
    <YStack minWidth={0}>
      <Text
        testID="header-greeting-title"
        fontSize={16}
        fontWeight="900"
        color="$color"
        lineHeight={19}
        numberOfLines={1}
      >
        {title}
      </Text>
      {showLocation ? (
        <>
          <XStack
            testID="header-location"
            role="button"
            aria-label="Select location"
            onPress={() => setOpen(true)}
            alignItems="center"
            gap={2}
            marginTop={-1}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize={12.5} fontWeight="500" color="$primary" numberOfLines={1}>
              {cityLabel || 'Select city'}
            </Text>
            <MaterialIcons name="chevron-right" size={16} color={color} />
          </XStack>
          <LocationDialog open={open} onClose={() => setOpen(false)} />
        </>
      ) : null}
    </YStack>
  );
}
