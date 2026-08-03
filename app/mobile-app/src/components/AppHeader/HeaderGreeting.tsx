import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const DEFAULT_TAGLINE = 'It All Starts Here!';

interface Props {
  tagline?: string | null;
  /** When false (studio/survey headers) only the tagline shows — no location row. */
  showLocation: boolean;
}

/** Home header left block (mock): the tappable pin + city on top, the BIG
 * admin-configurable tagline beneath it, then the greeting subtitle. The
 * Tamagui twin of mWeb's HeaderGreeting. */
export function HeaderGreeting({ tagline, showLocation }: Readonly<Props>) {
  const { cityLabel } = useLocations();
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const title = tagline?.trim() || DEFAULT_TAGLINE;

  return (
    <YStack minWidth={0}>
      {showLocation ? (
        <>
          <XStack
            testID="header-location"
            role="button"
            aria-label="Select location"
            onPress={() => setOpen(true)}
            alignItems="center"
            gap={2}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="location-on" size={13} color={primary} />
            <Text fontSize={12} fontWeight="600" color="$primary" numberOfLines={1}>
              {cityLabel || 'Select city'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={primary} />
          </XStack>
          <LocationDialog open={open} onClose={() => setOpen(false)} />
        </>
      ) : null}
      <Text
        testID="header-greeting-title"
        fontSize={21}
        fontWeight="700"
        color="$color"
        lineHeight={25}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text fontSize={11.5} fontWeight="600" color="$muted" numberOfLines={1}>
        {t('mweb.home.greetingSubtitle')}
      </Text>
    </YStack>
  );
}
